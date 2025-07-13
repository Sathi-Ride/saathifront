import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from '../../components/ui/Toast';
import { locationService } from '../utils/locationService';
import webSocketService from '../utils/websocketService';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { useUserRole } from '../utils/userRoleManager';
import { throttle } from 'lodash'; // Ensure lodash is installed: npm install lodash

const { width, height } = Dimensions.get('window');

// Ride interface based on backend response
interface Ride {
  _id?: string;
  pickUp?: {
    coords: {
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
  dropOff?: {
    coords: {
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
  status?: string;
  driver?: {
    mobile: string;
    _id: string;
    firstName?: string;
    lastName?: string;
  };
  passenger?: {
    mobile: string;
    firstName?: string;
    lastName?: string;
  };
  currLocation?: {
    latitude: number;
    longitude: number;
  };
}

// Calculate distance in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  console.log('[calculateDistance] lat1:', lat1, 'lon1:', lon1, 'lat2:', lat2, 'lon2:', lon2, 'distance:', distance);
  return distance;
};

// Progress calculation is handled entirely by the backend
// No local calculation needed

// Simulate driver movement
const simulateDriverMovement = async (
  rideId: string,
  startLocation: { lat: number; lng: number },
  pickupLocation: { lat: number; lng: number },
  dropoffLocation: { lat: number; lng: number },
  onLocationUpdate: (location: { lat: number; lng: number }) => void,
  onProgressUpdate: (progress: number) => void,
  setSimulating: (v: boolean) => void,
  userRole: 'driver' | 'passenger',
  rideStatusRef: React.RefObject<string>,
  rideStartTime: number | null
) => {
  console.log('[simulateDriverMovement] Starting simulation from:', startLocation, 'to pickup:', pickupLocation, 'then dropoff:', dropoffLocation);
  setSimulating(true);
  locationService.stopLocationTracking();
  const totalSteps = 50;
  const stepDelay = 1000; // Increased from 200ms to 1000ms to slow down simulation

  onLocationUpdate(startLocation);
  // Progress will be updated by backend via WebSocket

      // Phase 1: Current location to pickup (0-25%)
  for (let i = 0; i <= totalSteps; i++) {
    if (rideStatusRef.current === 'cancelled') {
      console.log('[simulateDriverMovement] Ride cancelled, stopping simulation');
      break;
    }
    if (rideStatusRef.current !== 'in-progress') {
      console.log('[simulateDriverMovement] Ride status changed to', rideStatusRef.current, 'stopping simulation');
      break;
    }
    const t = i / totalSteps;
    const currentLat = startLocation.lat + (pickupLocation.lat - startLocation.lat) * t;
    const currentLng = startLocation.lng + (pickupLocation.lng - startLocation.lng) * t;
    const location = { lat: currentLat, lng: currentLng };
    console.log('[simulateDriverMovement] Phase 1, step', i, 'location:', location);
    onLocationUpdate(location);
    
    // Backend will calculate progress automatically
    console.log('[simulateDriverMovement] Phase 1, step', i, 'location:', location);
    // Progress will be updated by backend via WebSocket
    
    if (userRole === 'driver') {
      try {
        webSocketService.emitEvent(
          'updateRideLocation',
          { latitude: currentLat, longitude: currentLng },
          (response: any) => {
            console.log('[simulateDriverMovement] updateRideLocation response:', response);
          },
          'ride'
        );
      } catch (error: any) {
        console.error('[simulateDriverMovement] WebSocket error:', error);
        // Suppress 400 errors during simulation - they're expected if backend rejects updates
        if (error.message?.includes('400') || error.message?.includes('Failed to update location')) {
          console.log('[simulateDriverMovement] Suppressed expected 400 error during simulation');
        } else {
          // Only log non-400 errors
          console.error('[simulateDriverMovement] Non-400 error during simulation:', error);
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, stepDelay));
  }

      // Phase 2: Pickup to dropoff (25-100%)
  for (let i = 0; i <= totalSteps; i++) {
    if (rideStatusRef.current === 'cancelled') {
      console.log('[simulateDriverMovement] Ride cancelled, stopping simulation');
      break;
    }
    if (rideStatusRef.current !== 'in-progress') {
      console.log('[simulateDriverMovement] Ride status changed to', rideStatusRef.current, 'stopping simulation');
      break;
    }
    const t = i / totalSteps;
    const currentLat = pickupLocation.lat + (dropoffLocation.lat - pickupLocation.lat) * t;
    const currentLng = pickupLocation.lng + (dropoffLocation.lng - pickupLocation.lng) * t;
    const location = { lat: currentLat, lng: currentLng };
    console.log('[simulateDriverMovement] Phase 2, step', i, 'location:', location);
    onLocationUpdate(location);
    
    // Backend will calculate progress automatically
    console.log('[simulateDriverMovement] Phase 2, step', i, 'location:', location);
    // Progress will be updated by backend via WebSocket
    
    if (userRole === 'driver') {
      try {
        await webSocketService.emitEvent(
          'updateRideLocation',
          { latitude: currentLat, longitude: currentLng },
          (response: any) => {
            console.log('[simulateDriverMovement] updateRideLocation response:', response);
          },
          'ride'
        );
      } catch (error: any) {
        console.error('[simulateDriverMovement] WebSocket error:', error);
        // Suppress 400 errors during simulation - they're expected if backend rejects updates
        if (error.message?.includes('400') || error.message?.includes('Failed to update location')) {
          console.log('[simulateDriverMovement] Suppressed expected 400 error during simulation');
        } else {
          // Only log non-400 errors
          console.error('[simulateDriverMovement] Non-400 error during simulation:', error);
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, stepDelay));
  }

  setSimulating(false);
  console.log('[simulateDriverMovement] Simulation complete, rideStatus:', rideStatusRef.current);
  if (rideStatusRef.current === 'in-progress' && userRole === 'driver') {
    console.log('[simulateDriverMovement] Resuming real GPS tracking');
    locationService.startLocationTracking(
      async (newLocation) => {
        if (rideStatusRef.current === 'in-progress') {
          onLocationUpdate({ lat: newLocation.latitude, lng: newLocation.longitude });
        }
      },
      { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 } // Use same intervals as real tracking
    );
  }
};

// Memoized MapView to prevent unnecessary re-renders
const MemoizedMapView = React.memo(MapView);

const RideTrackerScreen = () => {
  // --- PARAMS & ROUTER ---
  const params = useLocalSearchParams();
  const router = useRouter();
  const rideId = params.rideId as string;
  const userRole = useUserRole();
  const driverName = params.driverName as string;
  const passengerName = params.passengerName as string;
  const from = params.from as string;
  const to = params.to as string;
  const fare = params.fare as string;
  const vehicle = params.vehicle as string;
  const rideInProgress = params.rideInProgress === 'true';

  // --- STATE ---
  const [progress, setProgress] = useState(0);
  const [rideStatus, setRideStatus] = useState<'accepted' | 'in-progress' | 'completed' | 'cancelled'>(
    rideInProgress ? 'in-progress' : 'accepted'
  );
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rideDetails, setRideDetails] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [completedRoute, setCompletedRoute] = useState<{ lat: number; lng: number }[]>([]);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [rideStartTime, setRideStartTime] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellationModalVisible, setIsCancellationModalVisible] = useState(false);

  // --- ANIMATION REFS ---
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // --- REFS ---
  const isMounted = useRef(true);
  const rideStatusRef = useRef<'accepted' | 'in-progress' | 'completed' | 'cancelled'>(rideStatus);
  const pickupLocationRef = useRef(pickupLocation);
  const dropoffLocationRef = useRef(dropoffLocation);
  const lastLocationUpdateRef = useRef(0);
  const rideStartedConfirmedRef = useRef(false);
  const locationTrackingStartedRef = useRef(false);
  const initialDriverLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Update refs
  useEffect(() => {
    rideStatusRef.current = rideStatus;
    console.log('[RefUpdate] rideStatusRef:', rideStatus);
  }, [rideStatus]);
  useEffect(() => {
    pickupLocationRef.current = pickupLocation;
    console.log('[RefUpdate] pickupLocationRef:', pickupLocation);
  }, [pickupLocation]);
  useEffect(() => {
    dropoffLocationRef.current = dropoffLocation;
    console.log('[RefUpdate] dropoffLocationRef:', dropoffLocation);
  }, [dropoffLocation]);

  // --- TOAST HELPERS ---
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log('[showToast]', message, 'type:', type);
    setToast({ visible: true, message, type });
    setTimeout(hideToast, 3000);
  };
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // --- LOGGING ---
  useEffect(() => {
    console.log('[RideTracker] Initializing rideId:', rideId, 'userRole:', userRole, 'rideStatus:', rideStatus);
  }, [rideId, userRole, rideStatus]);

  // --- WEBSOCKET CONNECTION ---
  const ensureSocketConnected = useCallback(async (rideId: string, namespace: 'passenger' | 'driver' | 'ride') => {
    try {
      if (!webSocketService.isSocketConnected(namespace)) {
          await webSocketService.connect(rideId, namespace);
        console.log(`[WebSocket] Connected to ${namespace} namespace with rideId: ${rideId}`);
      } else {
        console.log(`[WebSocket] Already connected to ${namespace} namespace with rideId: ${rideId}`);
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to connect to ${namespace} namespace:`, error);
      showToast(`Failed to connect to ${namespace} WebSocket`, 'error');
      throw error;
    }
  }, []);

  // --- EMIT WHEN CONNECTED ---
  const emitWhenConnected = useCallback(
    async (event: string, data: any, namespace: 'passenger' | 'driver' | 'ride', timeoutMs: number = 15000) => {
      let attempt = 0;
      const maxRetries = 3;
      while (attempt < maxRetries) {
        try {
          await ensureSocketConnected(rideId, namespace);
          return await new Promise((resolve, reject) => {
            webSocketService.emitEvent(event, data, (response: any) => {
              console.log(`[emitWhenConnected] ${event} response in ${namespace} namespace:`, response);
              if (response?.code === 200 || response?.code === 201) {
                resolve(response.data || response);
              } else {
                reject(new Error(response?.message || `Failed to emit ${event}`));
              }
            }, namespace);
            setTimeout(() => reject(new Error(`Timeout emitting ${event}`)), timeoutMs);
          });
        } catch (error) {
          attempt++;
          console.error(`[emitWhenConnected] Attempt ${attempt} failed for ${event}:`, error);
          if (attempt >= maxRetries) {
            showToast(`Failed to emit ${event} after ${maxRetries} attempts`, 'error');
            throw error;
          }
          await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)));
        }
      }
    },
    [ensureSocketConnected, rideId]
  );

  const emitWhenConnectedRef = useRef(emitWhenConnected);
  useEffect(() => {
    emitWhenConnectedRef.current = emitWhenConnected;
  }, [emitWhenConnected]);

  // --- UPDATE DRIVER LOCATION ---
  const updateDriverLocation = useCallback(
    throttle(
    async (location: { lat: number; lng: number }) => {
        console.log('[updateDriverLocation] Called with userRole:', userRole, 'location:', location);
        // Only allow drivers to update ride location
        if (userRole !== 'driver') {
          console.log('[updateDriverLocation] Blocked - user is not driver');
          return; // Silent return for passengers
        }
        
        // Additional safety check - ensure this is really a driver
        if (!webSocketService.isSocketConnected('driver')) {
          return; // Silent return if driver socket not connected
        }
        
        if (simulating) {
          console.log('[updateDriverLocation] Skipping real location update: simulation in progress');
          return;
        }
        if (!pickupLocationRef.current || !dropoffLocationRef.current) {
          console.log('[updateDriverLocation] Missing pickup or dropoff location');
          return;
        }
        if (rideStatusRef.current === 'cancelled') {
          console.log('[updateDriverLocation] Ride is cancelled, skipping update');
          return;
        }
        if (rideStatusRef.current !== 'in-progress' || !rideStartedConfirmedRef.current) {
          console.log('[updateDriverLocation] Ride not in-progress or not confirmed, skipping update');
          return;
        }

        try {
          console.log('[updateDriverLocation] Updating location:', location);
        setDriverLocation(location);
          setCompletedRoute(prev => {
            const newRoute = [...prev.slice(-100), location];
            console.log('[updateDriverLocation] Updated completedRoute:', newRoute);
            return newRoute;
          });

          // Backend will calculate progress automatically
          console.log('[updateDriverLocation] Location updated, backend will calculate progress');

          // Only send location updates if user is driver and ride is in progress
          if (userRole === 'driver' && rideStatusRef.current === 'in-progress' && rideStartedConfirmedRef.current && !simulating) {
            const now = Date.now();
            if (now - lastLocationUpdateRef.current < 3000) { // Increased throttle to 3 seconds
              console.log('[updateDriverLocation] Throttling location update');
              return;
            }
            lastLocationUpdateRef.current = now;
            
            // Backend handles progress calculation including initial movement detection
            console.log('[updateDriverLocation] Backend will handle progress calculation');
            
            const payload = { latitude: location.lat, longitude: location.lng };
            console.log('[updateDriverLocation] Emitting updateRideLocation:', payload);
            
            try {
              await emitWhenConnectedRef.current('updateRideLocation', payload, 'ride');
            } catch (error: any) {
              console.error('[updateDriverLocation] WebSocket error:', error);
              // Suppress 400 errors - they're expected in certain scenarios
              if (error.message?.includes('400') || error.message?.includes('Failed to update location')) {
                console.log('[updateDriverLocation] Suppressed expected 400 error for location update');
                // Only attempt reconnection for non-400 errors or if it's a token issue
                if (error.message?.includes('token') || error.message?.includes('unauthorized')) {
                  console.log('[updateDriverLocation] Attempting to refresh token and reconnect');
                  try {
                    await webSocketService.reconnectAllWithNewToken();
                    // Retry the location update once after reconnection
                    setTimeout(async () => {
                      if (rideStatusRef.current === 'in-progress') {
                        try {
                          await emitWhenConnectedRef.current('updateRideLocation', payload, 'ride');
                        } catch (retryError) {
                          console.error('[updateDriverLocation] Retry failed:', retryError);
                        }
                      }
                    }, 1000);
                  } catch (reconnectError) {
                    console.error('[updateDriverLocation] Reconnection failed:', reconnectError);
                  }
                }
              }
            }
            
            // Check if at dropoff
            const toDropoffDistance = calculateDistance(
              location.lat,
              location.lng,
              dropoffLocationRef.current.lat,
              dropoffLocationRef.current.lng
            );
            if (toDropoffDistance < 0.05) { // 50m threshold
              console.log('[updateDriverLocation] Driver at dropoff, completing ride');
              
              // Set progress to 100% before completing
              setProgress(100);
          Animated.timing(progressAnimation, {
                toValue: 100,
            duration: 500,
            useNativeDriver: false,
          }).start();
              
              await emitWhenConnectedRef.current('endRide', { rideId }, 'ride');
              setRideStatus('completed');
              setRideStartTime(null);
              showToast('Ride completed!', 'success');
              setTimeout(() => router.push('/(driver)'), 2000);
            }
        } else {
            console.log('[updateDriverLocation] Not sending location update - userRole:', userRole, 'rideStatus:', rideStatusRef.current, 'rideStartedConfirmed:', rideStartedConfirmedRef.current);
        }
      } catch (error) {
          console.error('[updateDriverLocation] Error:', error);
        showToast('Error updating location', 'error');
      }
    },
      3000, // Increased throttle to 3 seconds
      { leading: false }
    ),
    [rideId, userRole, progressAnimation, simulating, rideStartTime]
  );

  const updateDriverLocationRef = useRef(updateDriverLocation);
  useEffect(() => {
    updateDriverLocationRef.current = updateDriverLocation;
  }, [updateDriverLocation]);

  // --- UPDATE PASSENGER LOCATION ---
  const updatePassengerLocation = useCallback(
    throttle(
      async (location: { lat: number; lng: number }) => {
        console.log('[updatePassengerLocation] Called with userRole:', userRole, 'location:', location);
        // PASSENGERS DO NOT SEND LOCATION UPDATES DURING RIDES
        // They only receive location updates from drivers
        if (userRole !== 'passenger') {
          console.log('[updatePassengerLocation] Blocked - user is not passenger');
          return; // Silent return for drivers
        }
        
        // CRITICAL: Passengers should NOT send location updates during rides
        // This was causing 400 errors because passengers were trying to update ride location
        console.log('[updatePassengerLocation] PASSENGER LOCATION UPDATES DISABLED DURING RIDES');
        return; // Silent return - passengers don't send location updates during rides
        
        // The code below is commented out to prevent passenger location update errors
        /*
        // Additional safety check - ensure this is really a passenger
        if (!webSocketService.isSocketConnected('passenger')) {
          return; // Silent return if passenger socket not connected
        }
        
        try {
          console.log('[updatePassengerLocation] Updating passenger location:', location);
          
          // Send passenger location update to passenger namespace
          const payload = { latitude: location.lat, longitude: location.lng };
          console.log('[updatePassengerLocation] Emitting pingStatus to passenger namespace:', payload);
          
          try {
            await emitWhenConnectedRef.current('pingStatus', payload, 'passenger');
            console.log('[updatePassengerLocation] Passenger location updated successfully');
          } catch (error: any) {
            console.error('[updatePassengerLocation] WebSocket error:', error);
            // If it's a 400 error, it might be due to expired token
            if (error.message?.includes('400') || error.message?.includes('Failed to update location')) {
              console.log('[updatePassengerLocation] Attempting to refresh token and reconnect');
              try {
                await webSocketService.reconnectAllWithNewToken();
                // Retry the location update once after reconnection
                setTimeout(async () => {
                  try {
                    await emitWhenConnectedRef.current('pingStatus', payload, 'passenger');
                  } catch (retryError) {
                    console.error('[updatePassengerLocation] Retry failed:', retryError);
                  }
                }, 1000);
              } catch (reconnectError) {
                console.error('[updatePassengerLocation] Reconnection failed:', reconnectError);
              }
            }
          }
        } catch (error) {
          console.error('[updatePassengerLocation] Error:', error);
          // Don't show toast for passenger location updates to avoid spam
        }
        */
      },
      10000, // Throttle to 10 seconds for passengers (less frequent than drivers)
      { leading: false }
    ),
    [userRole]
  );

  const updatePassengerLocationRef = useRef(updatePassengerLocation);
  useEffect(() => {
    updatePassengerLocationRef.current = updatePassengerLocation;
  }, [updatePassengerLocation]);

  // --- HANDLE RIDE LOCATION UPDATED ---
  const handleRideLocationUpdated = useCallback(
    throttle(
      (response: any) => {
        console.log('[handleRideLocationUpdated] Received:', response);
        if (!response || !response.data || response.data._id !== rideId) {
          console.log('[handleRideLocationUpdated] Invalid or mismatched rideId:', response?.data?._id);
          return;
        }
        const data = response.data;
        
        // Set pickup and dropoff locations from the data if not already set
        if (data.pickUp?.coords?.coordinates && !pickupLocationRef.current) {
          const pickup = {
            lat: data.pickUp.coords.coordinates[1],
            lng: data.pickUp.coords.coordinates[0],
          };
          setPickupLocation(pickup);
          pickupLocationRef.current = pickup;
          console.log('[handleRideLocationUpdated] Set pickupLocation from WebSocket:', pickup);
        }
        
        if (data.dropOff?.coords?.coordinates && !dropoffLocationRef.current) {
          const dropoff = {
            lat: data.dropOff.coords.coordinates[1],
            lng: data.dropOff.coords.coordinates[0],
          };
          setDropoffLocation(dropoff);
          dropoffLocationRef.current = dropoff;
          console.log('[handleRideLocationUpdated] Set dropoffLocation from WebSocket:', dropoff);
        }
        
        if (!data.currLocation || !data.currLocation.latitude || !data.currLocation.longitude) {
          console.log('[handleRideLocationUpdated] Missing currLocation data');
          return;
        }
        const newLocation = { lat: data.currLocation.latitude, lng: data.currLocation.longitude };

        // Defer state updates to next frame and batch them
        requestAnimationFrame(() => {
          // Batch state updates to prevent excessive re-renders
          const updates = () => {
            setDriverLocation(newLocation);
            setCompletedRoute(prev => {
              const newRoute = [...prev.slice(-100), newLocation];
              console.log('[handleRideLocationUpdated] Updated completedRoute:', newRoute);
              return newRoute;
            });
            
            // Both driver and passenger use progress from WebSocket (calculated by backend)
            if (data.progress !== undefined) {
              console.log('[handleRideLocationUpdated] Using backend-calculated progress:', data.progress, 'userRole:', userRole);
              setProgress(data.progress);
        Animated.timing(progressAnimation, {
                toValue: data.progress,
          duration: 500,
          useNativeDriver: false,
        }).start();
            } else {
              console.log('[handleRideLocationUpdated] No progress data from backend, userRole:', userRole);
            }
          };
          
          // Use setTimeout to ensure updates happen in the next tick
          setTimeout(updates, 0);
        });
      },
      1000, // Increased throttle to 1 second to reduce frequency
      { leading: false }
    ),
    [rideId, progressAnimation, rideStartTime]
  );

  // --- INITIALIZE LOCATION TRACKING ---
  const initializeLocationTracking = async () => {
    try {
      if (simulating) {
        console.log('[initializeLocationTracking] Simulation in progress, skipping real tracking');
        return;
      }
      if (rideStatus !== 'in-progress' || !rideStartedConfirmedRef.current) {
        console.log('[initializeLocationTracking] Not starting: rideStatus:', rideStatus, 'rideStartedConfirmed:', rideStartedConfirmedRef.current);
        return;
      }
      
      // Prevent multiple location tracking sessions
      if (locationTrackingStartedRef.current) {
        console.log('[initializeLocationTracking] Location tracking already started, skipping');
        return;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('[initializeLocationTracking] Location permission denied');
        showToast('Location permission denied', 'error');
        return;
      }
      
      // CRITICAL: Stop any existing location tracking to prevent conflicts
      locationService.stopLocationTracking();
      console.log('[initializeLocationTracking] Stopped existing location tracking');
      
      // Add a longer delay to ensure the previous tracking session is fully stopped
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (userRole === 'driver') {
        // For drivers: start continuous location tracking for ride updates
        const location = await locationService.getCurrentLocation();
        console.log('[initializeLocationTracking] Driver initial location:', location);
        updateDriverLocationRef.current({ lat: location.latitude, lng: location.longitude });
        
        await locationService.startLocationTracking(
          async (newLocation) => {
            // Only update location if user is driver and ride is in progress
            if (userRole === 'driver' && rideStatusRef.current === 'in-progress' && !simulating) {
              console.log('[initializeLocationTracking] Driver new location:', newLocation);
              updateDriverLocationRef.current({ lat: newLocation.latitude, lng: newLocation.longitude });
            }
          },
          { 
            accuracy: Location.Accuracy.Balanced, 
            timeInterval: 10000, // Increased to 10 seconds to reduce frequency
            distanceInterval: 50, // Increased to 50 meters
            role: 'driver'
          }
        );
        console.log('[initializeLocationTracking] Started continuous tracking for driver');
        locationTrackingStartedRef.current = true;
      } else if (userRole === 'passenger') {
        // For passengers: NO location tracking at all during rides
        // Passengers only need to receive location updates, not send them
        console.log('[initializeLocationTracking] Passenger location tracking completely disabled during rides');
        locationTrackingStartedRef.current = true;
      }
    } catch (error) {
      console.error('[initializeLocationTracking] Error:', error);
      showToast('Error starting location tracking', 'error');
    }
  };

  // --- SETUP WEBSOCKET AND FETCH RIDE DETAILS ---
  useEffect(() => {
    isMounted.current = true;
    console.log('[RideTracker] Setup effect for rideId:', rideId, 'userRole:', userRole);
    
    const setupWebSocketAndFetch = async () => {
      try {
        setIsLoadingDetails(true);
        
        // If ride is already cancelled, don't setup WebSocket or fetch details
        if (rideStatus === 'cancelled') {
          console.log('[setupWebSocketAndFetch] Ride is cancelled, skipping setup');
          setIsLoadingDetails(false);
          return;
        }
        
        const namespaces = ['ride', userRole];
        await Promise.all(namespaces.map(ns => ensureSocketConnected(rideId, ns as any)));
        const details = (await emitWhenConnected('getRideDetails', { rideId }, 'ride')) as Ride;
        console.log('[setupWebSocketAndFetch] Ride details:', JSON.stringify(details, null, 2));
        if (isMounted.current && details) {
          setRideDetails(details);
          
          // Check if ride is cancelled in the backend
          if (details?.status === 'cancelled') {
            console.log('[setupWebSocketAndFetch] Ride is cancelled in backend');
            setRideStatus('cancelled');
            setIsLoadingDetails(false);
            showToast('This ride has been cancelled', 'info');
            setTimeout(() => {
              if (isMounted.current) {
                router.push(userRole === 'passenger' ? '/(tabs)' : '/(driver)');
              }
            }, 2000);
            return;
          }
          
          if (details?.pickUp?.coords?.coordinates) {
            const pickup = {
              lat: details.pickUp.coords.coordinates[1],
              lng: details.pickUp.coords.coordinates[0],
            };
            setPickupLocation(pickup);
            console.log('[setupWebSocketAndFetch] Set pickupLocation:', pickup);
          }
          if (details?.dropOff?.coords?.coordinates) {
            const dropoff = {
              lat: details.dropOff.coords.coordinates[1],
              lng: details.dropOff.coords.coordinates[0],
            };
            setDropoffLocation(dropoff);
            console.log('[setupWebSocketAndFetch] Set dropoffLocation:', dropoff);
          }
          if (details?.status === 'ongoing') {
            setRideStatus('in-progress');
            rideStartedConfirmedRef.current = true;
            console.log('[setupWebSocketAndFetch] Set rideStatus to in-progress');
          } else if (details?.status === 'completed') {
            setRideStatus('completed');
            console.log('[setupWebSocketAndFetch] Set rideStatus to completed');
          }
          if (details?.currLocation) {
            const initialLocation = {
              lat: details.currLocation.latitude,
              lng: details.currLocation.longitude,
            };
            setDriverLocation(initialLocation);
            setCompletedRoute([initialLocation]);
            console.log('[setupWebSocketAndFetch] Set initial driverLocation:', initialLocation);
          } else if (userRole === 'driver') {
            const location = await locationService.getCurrentLocation();
            const initialLocation = { lat: location.latitude, lng: location.longitude };
            setDriverLocation(initialLocation);
            setCompletedRoute([initialLocation]);
            console.log('[setupWebSocketAndFetch] Set driverLocation from GPS:', initialLocation);
          } else if (userRole === 'passenger') {
            // For passengers, if no current location is available, use a default location
            // This will be updated when the driver sends their first location update
            const defaultLocation = {
              lat: pickupLocation?.lat || 26.6587,
              lng: pickupLocation?.lng || 87.3255,
            };
            setDriverLocation(defaultLocation);
            setCompletedRoute([defaultLocation]);
            console.log('[setupWebSocketAndFetch] Set default driverLocation for passenger:', defaultLocation);
          }
        }
        setIsLoadingDetails(false);

        webSocketService.on('rideStatusUpdate', (data: any) => {
          if (!isMounted.current || !data) return;
          console.log('[rideStatusUpdate] Received:', data);
          setRideStatus(data.status === 'ongoing' ? 'in-progress' : data.status);
        }, 'ride');
        webSocketService.on('rideStarted', (data: any) => {
          if (!isMounted.current) return;
          console.log('[rideStarted] Received:', data);
          
          // Set pickup and dropoff locations from the data if available
          if (data?.data?.pickUp?.coords?.coordinates) {
            const pickup = {
              lat: data.data.pickUp.coords.coordinates[1],
              lng: data.data.pickUp.coords.coordinates[0],
            };
            setPickupLocation(pickup);
            pickupLocationRef.current = pickup;
            console.log('[rideStarted] Set pickupLocation from event:', pickup);
          }
          
          if (data?.data?.dropOff?.coords?.coordinates) {
            const dropoff = {
              lat: data.data.dropOff.coords.coordinates[1],
              lng: data.data.dropOff.coords.coordinates[0],
            };
            setDropoffLocation(dropoff);
            dropoffLocationRef.current = dropoff;
            console.log('[rideStarted] Set dropoffLocation from event:', dropoff);
          }
          
          setRideStatus('in-progress');
          rideStartedConfirmedRef.current = true;
          setProgress(0);
          setRideStartTime(Date.now());
          
          // Update driver location if provided in the event
          if (data?.data?.currLocation) {
            const newLocation = {
              lat: data.data.currLocation.latitude,
              lng: data.data.currLocation.longitude,
            };
            setDriverLocation(newLocation);
            setCompletedRoute([newLocation]);
            console.log('[rideStarted] Set driverLocation from event:', newLocation);
          }
          
          // Store initial driver location for movement detection
          if (driverLocation) {
            initialDriverLocationRef.current = { ...driverLocation };
            console.log('[rideStarted] Initial driver location:', initialDriverLocationRef.current);
          }
          
          // Animate progress to 0%
          Animated.timing(progressAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }).start();
          
          showToast('Ride started!', 'success');
          console.log('[rideStarted] Progress will stay at 0% until driver moves');
        }, 'ride');
        webSocketService.on('rideCompleted', (data: any) => {
          if (!isMounted.current) return;
          console.log('[rideCompleted] Received:', data);
          setRideStatus('completed');
          setRideStartTime(null);
          showToast('Ride completed!', 'success');
          setTimeout(() => {
            if (isMounted.current) {
              router.push({
                pathname: userRole === 'passenger' ? '/(tabs)/rideRate' : '/(driver)',
                params: { rideId, driverName, passengerName, from, to, fare, vehicle },
              });
            }
          }, 2000);
        }, 'ride');
        webSocketService.on('rideLocationUpdated', handleRideLocationUpdated, 'ride');
        
        // Add error handler for WebSocket errors
        webSocketService.on('error', (error: any) => {
          // Suppress expected 400 errors
          if (error && (error.code === 400 || error.message?.includes('400') || error.message?.includes('Failed to update location'))) {
            console.log('[WebSocket] Suppressed expected 400 error in ride namespace:', error.message);
            return;
          }
          console.error('[WebSocket] Error in ride namespace:', error);
        }, 'ride');
        
        // Also add error handler for the socket itself
        const rideSocket = webSocketService.getSocket('ride');
        if (rideSocket) {
          rideSocket.on('error', (error: any) => {
            // Suppress expected 400 errors
            if (error && (error.code === 400 || error.message?.includes('400') || error.message?.includes('Failed to update location'))) {
              console.log('[WebSocket] Suppressed expected 400 socket error in ride namespace:', error.message);
              return;
            }
            console.error('[WebSocket] Socket error in ride namespace:', error);
          });
        }
        
        webSocketService.on('rideCancelled', (data: any) => {
          if (!isMounted.current) return;
          console.log('[rideCancelled] Received:', data);
          const cancellationReason = data?.cancellationReason || 'Ride was cancelled';
          const cancelledBy = data?.cancelledBy || 'unknown';
          showToast(`Ride cancelled by ${cancelledBy}: ${cancellationReason}`, 'info');
          
          // Clean up state and connections
          setRideStatus('cancelled');
          setSimulating(false);
          setRideStartTime(null);
          locationService.stopLocationTracking();
          locationTrackingStartedRef.current = false;
          
          // Clean up WebSocket connections
          webSocketService.disconnect('ride');
          webSocketService.disconnect(userRole);
          
          setTimeout(() => {
            if (isMounted.current) {
              router.push(userRole === 'passenger' ? '/(tabs)' : '/(driver)');
            }
          }, 2000);
        }, 'ride');
      } catch (error) {
        console.error('[setupWebSocketAndFetch] Error:', error);
        showToast('Failed to load ride details', 'error');
        setIsLoadingDetails(false);
      }
    };
    
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    
    setupWebSocketAndFetch();
    if (userRole === 'driver' && rideStatus === 'in-progress' && rideStartedConfirmedRef.current) {
    initializeLocationTracking();
    }
    startPulseAnimation();
    
    return () => {
      console.log('[RideTracker] Cleanup effect');
      isMounted.current = false;
      locationService.stopLocationTracking();
      locationTrackingStartedRef.current = false;
        webSocketService.disconnect('ride');
      webSocketService.disconnect(userRole);
      webSocketService.off('rideStatusUpdate', undefined, 'ride');
      webSocketService.off('rideStarted', undefined, 'ride');
      webSocketService.off('rideCompleted', undefined, 'ride');
      webSocketService.off('rideLocationUpdated', handleRideLocationUpdated, 'ride');
      webSocketService.off('error', undefined, 'ride');
      webSocketService.off('rideCancelled', undefined, 'ride');
      
      // Clean up socket error handler
      const rideSocket = webSocketService.getSocket('ride');
      if (rideSocket) {
        rideSocket.off('error');
      }
    };
  }, [rideId, userRole]);

  // --- START LOCATION TRACKING ---
  useEffect(() => {
    // CRITICAL: Only drivers should track location during rides
    // Passengers should NEVER send location updates during rides
    if (userRole === 'driver' && rideStatus === 'in-progress' && !simulating && rideStartedConfirmedRef.current) {
      console.log('[RideTracker] Starting location tracking for driver');
      initializeLocationTracking();
    } else if (userRole === 'passenger') {
      console.log('[RideTracker] PASSENGER LOCATION TRACKING COMPLETELY DISABLED DURING RIDES');
      // Passengers should never track location during rides
    } else {
      console.log('[RideTracker] Not starting location tracking:', {
        userRole,
        rideStatus,
        simulating,
        rideStartedConfirmed: rideStartedConfirmedRef.current
      });
    }
  }, [userRole, rideStatus, simulating, rideStartedConfirmedRef.current]);

  // --- GENERATE ROUTE POLYLINES ---
  const generateRoutePolylines = () => {
    // If ride is cancelled, return empty array to prevent errors
    if (rideStatus === 'cancelled') {
      console.log('[generateRoutePolylines] Ride is cancelled, returning empty polylines');
      return [];
    }
    
    if (!pickupLocation || !dropoffLocation || !driverLocation) {
      console.log('[generateRoutePolylines] Missing location data, returning fallback polylines');
      return [
        {
          coordinates: [
            { latitude: pickupLocation?.lat || 26.6587, longitude: pickupLocation?.lng || 87.3255 },
            { latitude: dropoffLocation?.lat || 26.6587, longitude: dropoffLocation?.lng || 87.3255 },
          ],
          strokeColor: '#2196F3',
          strokeWidth: 4,
          lineDashPattern: [10, 5],
          key: 'fallback-route',
        },
      ];
    }
    
    // Ensure driver location is not exactly the same as pickup location to avoid distance calculation issues
    const driverLoc = {
      lat: driverLocation.lat,
      lng: driverLocation.lng,
    };
    
    // If driver is very close to pickup (within 10 meters), use pickup location
    const toPickupDistance = calculateDistance(
      driverLoc.lat,
      driverLoc.lng,
      pickupLocation.lat,
      pickupLocation.lng
    );
    
    if (toPickupDistance < 0.01) { // 10 meters
      console.log('[generateRoutePolylines] Driver very close to pickup, using pickup location');
      driverLoc.lat = pickupLocation.lat;
      driverLoc.lng = pickupLocation.lng;
    }

    const polylines = [];

    if (rideStatus === 'accepted') {
      // Show driver's path to pickup
      const toPickupRoute = [...completedRoute, driverLoc];
      if (toPickupRoute.length > 1) {
        polylines.push({
          coordinates: toPickupRoute.map(loc => ({ latitude: loc.lat, longitude: loc.lng })),
          strokeColor: '#4CAF50',
          strokeWidth: 6,
          key: 'completed-to-pickup',
        });
      }
      polylines.push({
        coordinates: [
          { latitude: driverLoc.lat, longitude: driverLoc.lng },
          { latitude: pickupLocation.lat, longitude: pickupLocation.lng },
        ],
        strokeColor: '#2196F3',
        strokeWidth: 4,
        lineDashPattern: [10, 5],
        key: 'remaining-to-pickup',
      });
    } else if (rideStatus === 'in-progress' || rideStatus === 'completed') {
      // Check if driver has reached pickup
      const toPickupDistance = calculateDistance(
        driverLoc.lat,
        driverLoc.lng,
        pickupLocation.lat,
        pickupLocation.lng
      );
      
      if (toPickupDistance > 0.05) {
        // Driver is still moving to pickup - show driver to pickup route
        const toPickupRoute = [...completedRoute, driverLoc];
        if (toPickupRoute.length > 1) {
          polylines.push({
            coordinates: toPickupRoute.map(loc => ({ latitude: loc.lat, longitude: loc.lng })),
            strokeColor: '#4CAF50',
            strokeWidth: 6,
            key: 'completed-to-pickup',
          });
        }
        polylines.push({
          coordinates: [
            { latitude: driverLoc.lat, longitude: driverLoc.lng },
            { latitude: pickupLocation.lat, longitude: pickupLocation.lng },
          ],
          strokeColor: '#2196F3',
          strokeWidth: 4,
          lineDashPattern: [10, 5],
          key: 'remaining-to-pickup',
        });
        
        // Also show the future route from pickup to dropoff (dotted line)
        polylines.push({
          coordinates: [
            { latitude: pickupLocation.lat, longitude: pickupLocation.lng },
            { latitude: dropoffLocation.lat, longitude: dropoffLocation.lng },
          ],
          strokeColor: '#075B5E',
          strokeWidth: 2,
          lineDashPattern: [5, 5],
          key: 'future-pickup-to-dropoff',
        });
      } else {
        // Driver has reached pickup - show pickup to dropoff route
        const fromPickupRoute = completedRoute.filter(
          loc =>
            calculateDistance(loc.lat, loc.lng, pickupLocation.lat, pickupLocation.lng) < 0.05 ||
            completedRoute.indexOf(loc) >
              completedRoute.findIndex(l => calculateDistance(l.lat, l.lng, pickupLocation.lat, pickupLocation.lng) < 0.05)
        );
      if (fromPickupRoute.length > 1) {
        polylines.push({
          coordinates: fromPickupRoute.map(loc => ({ latitude: loc.lat, longitude: loc.lng })),
          strokeColor: '#4CAF50',
          strokeWidth: 6,
          key: 'completed-to-dropoff',
        });
      }
        if (rideStatus === 'in-progress') {
      polylines.push({
            coordinates: [
              { latitude: driverLoc.lat, longitude: driverLoc.lng },
              { latitude: dropoffLocation.lat, longitude: dropoffLocation.lng },
            ],
        strokeColor: '#075B5E',
        strokeWidth: 4,
        lineDashPattern: [10, 5],
        key: 'remaining-to-dropoff',
      });
    }
      }
    }

    console.log('[generateRoutePolylines] Generated polylines:', polylines);
    return polylines;
  };

  // --- BUTTON HANDLERS ---
  const handleStartRide = async () => {
    if (userRole !== 'driver') {
      console.log('[handleStartRide] Not driver, skipping');
      return;
    }
    setLoading(true);
    try {
      console.log('[handleStartRide] Starting ride, rideId:', rideId);
      
      // Set progress to 0% - backend will handle progress calculation
      setProgress(0);
      setRideStartTime(Date.now());
      
      // Store the initial driver location to detect movement
      if (driverLocation) {
        initialDriverLocationRef.current = { ...driverLocation };
        console.log('[handleStartRide] Initial driver location:', initialDriverLocationRef.current);
      }
      
      Animated.timing(progressAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
      
      await emitWhenConnectedRef.current('startRide', { rideId }, 'ride');
      setRideStatus('in-progress');
      rideStartedConfirmedRef.current = true;
      showToast('Ride started!', 'success');
      
      // Keep justStarted true until driver actually moves
      // This ensures progress stays at 0% until real movement occurs
      console.log('[handleStartRide] Progress will stay at 0% until driver moves');
      
      // Send initial location update - backend will calculate progress automatically
      if (driverLocation) {
        try {
          await emitWhenConnectedRef.current('updateRideLocation', {
            latitude: driverLocation.lat,
            longitude: driverLocation.lng
            // No progress needed - backend calculates it!
          }, 'ride');
          console.log('[handleStartRide] Sent initial location update');
        } catch (error: any) {
          console.error('[handleStartRide] Failed to send initial location update:', error);
          // Suppress 400 errors - they might occur if backend hasn't fully processed startRide yet
          if (error.message?.includes('400') || error.message?.includes('Failed to update location')) {
            console.log('[handleStartRide] Suppressed expected 400 error for initial location update');
          }
        }
      }
    } catch (error) {
      console.error('[handleStartRide] Error:', error);
      showToast('Error starting ride', 'error');
      rideStartedConfirmedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateMovement = async () => {
    if (!driverLocation || !pickupLocation || !dropoffLocation) {
      console.error('[handleSimulateMovement] Missing location data');
      showToast('Missing location data for simulation', 'error');
      return;
    }
    setLoading(true);
    try {
      console.log('[handleSimulateMovement] Starting simulation');
      if (rideStatus !== 'in-progress') {
        await handleStartRide();
      }
        setProgress(0);
      setCompletedRoute([driverLocation]);
        Animated.timing(progressAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }).start();

      await simulateDriverMovement(
        rideId,
        driverLocation,
        pickupLocation,
        dropoffLocation,
        (location) => {
          setDriverLocation(location);
          setCompletedRoute(prev => {
            const newRoute = [...prev.slice(-100), location];
            console.log('[handleSimulateMovement] Updated completedRoute:', newRoute);
            return newRoute;
          });
        },
        // Progress updates are handled by backend via WebSocket
        () => {
          console.log('[handleSimulateMovement] Progress will be updated by backend');
        },
        setSimulating,
        userRole,
        rideStatusRef,
        rideStartTime
      );

      if (rideStatusRef.current === 'in-progress') {
        console.log('[handleSimulateMovement] Completing ride');
        
        // Set progress to 100% before completing
        setProgress(100);
        Animated.timing(progressAnimation, {
          toValue: 100,
          duration: 500,
          useNativeDriver: false,
        }).start();
        
        await emitWhenConnectedRef.current('endRide', { rideId }, 'ride');
        setRideStatus('completed');
        showToast('Ride completed!', 'success');
        setTimeout(() => router.push('/(driver)'), 2000);
      }
    } catch (error) {
      console.error('[handleSimulateMovement] Error:', error);
      showToast('Error during simulation', 'error');
      setSimulating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (userRole !== 'driver') {
      console.log('[handleCompleteRide] Not driver, skipping');
      return;
    }
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to complete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('[handleCompleteRide] Completing ride, rideId:', rideId);
              
              // Set progress to 100% before completing
              setProgress(100);
              Animated.timing(progressAnimation, {
                toValue: 100,
                duration: 500,
                useNativeDriver: false,
              }).start();
              
              await emitWhenConnectedRef.current('endRide', { rideId }, 'ride');
              setRideStatus('completed');
              setRideStartTime(null);
              showToast('Ride completed!', 'success');
              setTimeout(() => router.push('/(driver)'), 2000);
            } catch (error) {
              console.error('[handleCompleteRide] Error:', error);
              showToast('Error completing ride', 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelRide = () => {
    setIsCancellationModalVisible(true);
  };

  const handleConfirmCancelRide = async () => {
    if (!cancellationReason) {
      showToast('Please provide a reason for cancellation.', 'error');
      return;
    }
            setLoading(true);
            try {
      console.log('[handleConfirmCancelRide] Cancelling ride, rideId:', rideId, 'reason:', cancellationReason);
      const payload = {
        rideId,
        cancellationReason: cancellationReason.trim() || 'Cancelled by user',
        cancelledBy: userRole
      };
      await emitWhenConnectedRef.current('cancelRide', payload, 'ride');
              showToast('Ride cancelled', 'info');
      // Don't navigate here - let the rideCancelled event handle navigation
            } catch (error) {
      console.error('[handleConfirmCancelRide] Error:', error);
              showToast('Error cancelling ride', 'error');
            } finally {
              setLoading(false);
      setIsCancellationModalVisible(false);
      setCancellationReason('');
    }
  };

  const handleCallOtherUser = async () => {
    try {
      const phone = userRole === 'driver' ? rideDetails?.passenger?.mobile : rideDetails?.driver?.mobile;
      const phoneNumber = `tel:${phone || '9801020304'}`;
      console.log('[handleCallOtherUser] Calling:', phoneNumber);
      const canOpen = await Linking.canOpenURL(phoneNumber);
      if (canOpen) {
        await Linking.openURL(phoneNumber);
      } else {
        console.error('[handleCallOtherUser] Cannot open phone app');
        showToast('Cannot open phone app', 'error');
      }
    } catch (error) {
      console.error('[handleCallOtherUser] Error:', error);
      showToast('Error opening phone app', 'error');
    }
  };

  const handleMessageOtherUser = () => {
    console.log('[handleMessageOtherUser] Navigating to messaging');
    router.push({
      pathname: '/(common)/messaging',
      params: {
        rideId,
        driverName: userRole === 'driver' ? 'You' : driverName,
        passengerName: userRole === 'passenger' ? 'You' : passengerName,
        driverPhone: rideDetails?.driver?.mobile || '9815364055',
        passengerPhone: rideDetails?.passenger?.mobile || '9801020304',
        userRole,
      },
    });
  };

  // --- STATUS TEXT/COLOR HELPERS ---
  const getStatusText = () => {
    console.log('[getStatusText] rideStatus:', rideStatus, 'userRole:', userRole);
    switch (rideStatus) {
      case 'accepted':
        return userRole === 'driver' ? 'Ride accepted' : 'Driver accepted';
      case 'in-progress':
        return 'Ride in progress';
      case 'completed':
        return 'Ride completed';
      case 'cancelled':
        return 'Ride cancelled';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'accepted':
        return '#2196F3';
      case 'in-progress':
        return '#4CAF50';
      case 'completed':
        return '#075B5E';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  // --- RENDER ---
    if (!userRole) {
    console.error('[RideTracker] User role not set');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>User role not set. Please re-login.</Text>
      </View>
    );
  }

  if (isLoadingDetails) {
    console.log('[RideTracker] Loading ride details');
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" color="#075B5E" />
        <Text style={{ marginTop: 10 }}>Loading ride details...</Text>
      </View>
    );
  }

  // Show cancelled ride message
  if (rideStatus === 'cancelled') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <MaterialIcons name="cancel" size={64} color="#F44336" />
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 20, color: '#F44336' }}>
          Ride Cancelled
        </Text>
        <Text style={{ fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
          This ride has been cancelled. You will be redirected to your home screen.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#075B5E', marginTop: 30 }]}
          onPress={() => router.push(userRole === 'passenger' ? '/(tabs)' : '/(driver)')}
        >
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!pickupLocation || !dropoffLocation) {
    console.error('[RideTracker] Missing pickup or dropoff location');
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Missing location data. Please try again.</Text>
      </View>
    );
  }

  const otherUserName = userRole === 'driver'
    ? (rideDetails?.passenger?.firstName && rideDetails?.passenger?.lastName
        ? `${rideDetails.passenger.firstName} ${rideDetails.passenger.lastName}`
        : passengerName)
    : (rideDetails?.driver?.firstName && rideDetails?.driver?.lastName
        ? `${rideDetails.driver.firstName} ${rideDetails.driver.lastName}`
        : driverName);
  const otherUserRole = userRole === 'driver' ? 'passenger' : 'driver';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075B5E" />
      <View style={styles.mapContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        {userRole === 'driver' && rideStatus === 'in-progress' && !simulating && (
          <TouchableOpacity style={styles.simulateButton} onPress={handleSimulateMovement}>
            <MaterialIcons name="play-arrow" size={20} color="#075B5E" />
            <Text style={styles.simulateButtonText}>Simulate</Text>
          </TouchableOpacity>
        )}
        {userRole === 'driver' && simulating && (
          <View style={styles.simulateButton}>
            <MaterialIcons name="directions-car" size={20} color="#075B5E" />
            <Text style={styles.simulateButtonText}>Simulating...</Text>
          </View>
        )}
        <MemoizedMapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: pickupLocation?.lat || driverLocation?.lat || 26.6587,
            longitude: pickupLocation?.lng || driverLocation?.lng || 87.3255,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {generateRoutePolylines().map(polyline => (
            <Polyline
              key={polyline.key}
              coordinates={polyline.coordinates}
              strokeColor={polyline.strokeColor}
              strokeWidth={polyline.strokeWidth}
              lineDashPattern={polyline.lineDashPattern}
            />
          ))}
          {driverLocation && (
            <Marker
              coordinate={{
                latitude: driverLocation.lat,
                longitude: driverLocation.lng,
              }}
              title="Driver"
              description={userRole === 'driver' ? 'You' : otherUserName}
            >
              <View style={styles.driverMarker}>
                <MaterialIcons name="directions-car" size={20} color="#FF9800" />
              </View>
            </Marker>
          )}
          {pickupLocation && (
            <Marker
              coordinate={{
                latitude: pickupLocation.lat,
                longitude: pickupLocation.lng,
              }}
              title="Pickup"
              description={from}
            >
              <View style={styles.pickupMarker}>
                <MaterialIcons name="location-on" size={20} color="#4CAF50" />
              </View>
            </Marker>
          )}
          {dropoffLocation && (
            <Marker
              coordinate={{
                latitude: dropoffLocation.lat,
                longitude: dropoffLocation.lng,
              }}
              title="Dropoff"
              description={to}
            >
              <View style={styles.dropoffMarker}>
                <MaterialIcons name="location-on" size={20} color="#EA2F14" />
              </View>
            </Marker>
          )}
        </MemoizedMapView>
      </View>
      <View style={styles.bottomSheet}>
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Ride Progress</Text>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>From: {from}</Text>
          <Text style={styles.detailText}>To: {to}</Text>
          <Text style={styles.detailText}>
            {otherUserRole.charAt(0).toUpperCase() + otherUserRole.slice(1)}: {otherUserName}
          </Text>
          <Text style={styles.detailText}>Fare: {fare}</Text>
          <Text style={styles.detailText}>Vehicle: {vehicle}</Text>
            </View>
        <View style={styles.buttonContainer}>
          {userRole === 'driver' && rideStatus === 'accepted' && (
          <TouchableOpacity
              style={[styles.button, { backgroundColor: '#075B5E' }]}
              onPress={handleStartRide}
            disabled={loading}
          >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Start Ride</Text>
              )}
          </TouchableOpacity>
        )}
          {rideStatus === 'in-progress' && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#2196F3' }]}
              onPress={handleCompleteRide}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Ride</Text>
              )}
          </TouchableOpacity>
        )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#F44336' }]}
            onPress={handleCancelRide}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Cancel Ride</Text>
          </TouchableOpacity>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleCallOtherUser}
            >
              <MaterialIcons name="phone" size={20} color="#fff" />
          </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: '#2196F3' }]}
              onPress={handleMessageOtherUser}
            >
              <MaterialIcons name="message" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
          </View>
        </View>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <Modal
        visible={isCancellationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCancellationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for cancellation (e.g., Change of plans, Emergency)"
              multiline
              numberOfLines={4}
              value={cancellationReason}
              onChangeText={setCancellationReason}
            />
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#F44336' }]}
              onPress={handleConfirmCancelRide}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Confirm Cancel</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#666', marginTop: 10 }]}
              onPress={() => {
                setIsCancellationModalVisible(false);
                setCancellationReason('');
              }}
            >
              <Text style={styles.modalButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: width,
    height: height * 0.6,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: '#075B5E',
    borderRadius: 20,
    padding: 8,
  },
  simulateButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#075B5E',
  },
  simulateButtonText: {
    color: '#075B5E',
    marginLeft: 4,
    fontWeight: '600',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#075B5E',
  },
  progressText: {
    marginTop: 8,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
  },
  contactButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  pickupMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  dropoffMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#EA2F14',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalInput: {
    width: '100%',
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#075B5E',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RideTrackerScreen;