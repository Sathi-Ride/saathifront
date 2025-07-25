import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Dimensions,
  Switch,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { MapPin, Navigation, Clock, User, Car, Map } from 'lucide-react-native';
import ProfileImage from '../../components/ProfileImage';
import SidePanel from '../(common)/sidepanel';
import Toast from '../../components/ui/Toast';
import { rideService, Ride } from '../utils/rideService';
import { locationService } from '../utils/locationService';
import apiClient from '../utils/apiClient';
import webSocketService from '../utils/websocketService';
import { userRoleManager, useUserRole } from '../utils/userRoleManager';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const DriverSection = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [role, setRole] = useState<'driver' | 'passenger'>('driver');
  const [rideInProgress, setRideInProgress] = useState(false);
  
  // Get current user role from global manager
  const userRole = useUserRole();
  
  // Driver mode states
  const [isOnline, setIsOnline] = useState(false);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stopLocationTracking, setStopLocationTracking] = useState<(() => void) | null>(null);
  const [kycStatus, setKycStatus] = useState<'pending' | 'approved' | 'rejected' | 'verified' | null>(null);
  const [pendingOfferRideId, setPendingOfferRideId] = useState<string | null>(null);
  const [pendingOffers, setPendingOffers] = useState<Ride[]>([]);
  const [showBackConfirmation, setShowBackConfirmation] = useState(false);
  
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const [offerLoading, setOfferLoading] = useState<{ [key: string]: boolean }>({});
  const [newRideRequest, setNewRideRequest] = useState<any>(null);
  const [acceptedOfferId, setAcceptedOfferId] = useState<string | null>(null);
  const [showPassengerCancelledModal, setShowPassengerCancelledModal] = useState(false);
  const [cancelledRideId, setCancelledRideId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
    if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.selectionAsync();
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
      loadMyRides();
      setupWebSocket();
    } else {
      setAvailableRides([]);
      setMyRides([]);
      // Stop location tracking when going offline
      if (stopLocationTracking) {
        stopLocationTracking();
        setStopLocationTracking(null);
      }
      // Disconnect WebSocket when going offline
      webSocketService.disconnect();
    }

    return () => {
      // Clean up all event listeners when the effect re-runs or component unmounts
      webSocketService.off('newRideRequest');
      webSocketService.off('offerAccepted');
      webSocketService.off('offerRejected');
      webSocketService.off('rideCancelled');
      webSocketService.off('rideUnavailable');
      webSocketService.off('rideStatusUpdate');
    };
  }, [isOnline]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    if (stopLocationTracking) {
      stopLocationTracking();
    }
  }, [stopLocationTracking]);

  const startLocationTracking = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation({ lat: location.latitude, lng: location.longitude });
      
      await locationService.startLocationTracking((newLocation) => {
        setCurrentLocation({ lat: newLocation.latitude, lng: newLocation.longitude });
      }, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 50,
        role: 'driver'
      });
      
      // Store the stop function for cleanup
      setStopLocationTracking(() => () => locationService.stopLocationTracking());
    } catch (error) {
      console.warn('Error starting location tracking:', error);
      showToast('Location tracking started (offline mode)', 'info');
    }
  };

  const loadMyRides = async () => {
    try {
      const rides = await rideService.getDriverRides();
      setMyRides(rides);
    } catch (error) {
      console.error('Error loading my rides:', error);
    }
  };

  async function setupWebSocket() {
    try {
      // Connect to driver namespace for driver-specific events
      await webSocketService.connect(undefined, 'driver');
      
      let isMounted = true;
      let newRideRequestListener: any;
      let offerAcceptedListener: any;
      let offerRejectedListener: any;
      
      // Listen for new ride requests (driver namespace)
      newRideRequestListener = (event: any) => {
        console.log('DriverSection: New ride request received:', event);
        if (event && event.code === 200 && event.data) {
          setAvailableRides(prev => {
            if (prev.some(ride => ride._id === event.data._id)) return prev;
            return [...prev, event.data];
          });
          showToast('New ride request received!', 'info');
        }
      };
      webSocketService.on('newRideRequest', newRideRequestListener, 'driver');
      
      // Listen for offer accepted (driver namespace)
      offerAcceptedListener = async (data: any) => {
        if (!isMounted) return;
        console.log('DriverSection: Offer accepted event received:', data);
        if (data && data.code === 201 && data.data && data.data.ride) {
          const ride = data.data.ride;
          setAcceptedOfferId(ride._id);
          showToast('Your offer was accepted!', 'success');
          // Set user role to driver before navigating
          await userRoleManager.setRole('driver');
          // Navigate to ride tracker with full ride details
          router.push({
            pathname: '../(common)/rideTracker',
            params: {
              rideId: ride._id,
              driverName: ride.driver?.firstName + ' ' + ride.driver?.lastName,
              from: ride.pickUp?.location,
              to: ride.dropOff?.location,
              fare: ride.offerPrice,
              vehicle: ride.vehicle?.name,
            },
          });
        } else if (data && data.code && data.code !== 201) {
          showToast(data.message || 'Failed to accept offer. Please try again.', 'error');
        }
      };
      webSocketService.on('offerAccepted', offerAcceptedListener, 'driver');
      
      // Listen for passenger cancelled ride (driver namespace)
      const passengerCancelledListener = (data: any) => {
        if (!isMounted) return;
        console.log('DriverSection: Passenger cancelled ride event received:', data);
        console.log('DriverSection: Event data structure:', JSON.stringify(data, null, 2));
        
        // Handle different possible data structures
        let rideId = null;
        if (data && data.rideId) {
          rideId = data.rideId;
        } else if (data && data.data && data.data.rideId) {
          rideId = data.data.rideId;
        }
        
        console.log('DriverSection: Extracted rideId:', rideId);
        console.log('DriverSection: Current available rides:', availableRides.map(r => r._id));
        
        if (rideId) {
          console.log('DriverSection: Processing cancellation for rideId:', rideId);
          
          setCancelledRideId(rideId);
          setShowPassengerCancelledModal(true);
          
          // Remove the cancelled ride from available rides
          setAvailableRides(prev => {
            console.log('DriverSection: Filtering rides, removing:', rideId);
            console.log('DriverSection: Before filter:', prev.map(r => r._id));
            const filtered = prev.filter(ride => ride._id !== rideId);
            console.log('DriverSection: After filter:', filtered.map(r => r._id));
            return filtered;
          });
          
          // If this was the accepted offer, clear the accepted offer state
          if (acceptedOfferId === rideId) {
            console.log('DriverSection: Clearing accepted offer:', rideId);
            setAcceptedOfferId(null);
          }
          
          showToast('Passenger cancelled the ride request', 'info');
        } else {
          console.log('DriverSection: Could not extract rideId from data');
        }
      };
      webSocketService.on('passengerCancelledRide', passengerCancelledListener, 'driver');
      
      // Listen for offer rejected (driver namespace)
      offerRejectedListener = (data: any) => {
        if (!isMounted) return;
        console.log('DriverSection: Offer rejected event received:', data);
        
        if (data && data.data && data.data._id) {
          const rejectedOfferId = data.data._id;
          const rideId = data.data.rideId;
          console.log('DriverSection: Processing rejected offer:', rejectedOfferId, 'for ride:', rideId);
          
          // Clear the pending offer state for this specific ride
          if (pendingOfferRideId === rideId) {
            setPendingOfferRideId(null);
          }
          
          // Clear the accepted offer state if this was the accepted offer
          if (acceptedOfferId === rideId) {
            setAcceptedOfferId(null);
          }
          
          // Clear the loading state for this ride
          setOfferLoading(prev => ({ ...prev, [rideId]: false }));
          
          showToast('Your offer was rejected by passenger', 'info');
        } else if (data && data.code && data.code !== 201) {
          showToast(data.message || 'Error processing offer rejection', 'error');
        }
      };
      webSocketService.on('offerRejected', offerRejectedListener, 'driver');
      
      // Cleanup function
      return () => {
        isMounted = false;
        if (newRideRequestListener) webSocketService.off('newRideRequest', newRideRequestListener, 'driver');
        if (offerAcceptedListener) webSocketService.off('offerAccepted', offerAcceptedListener, 'driver');
        if (passengerCancelledListener) webSocketService.off('passengerCancelledRide', passengerCancelledListener, 'driver');
        if (offerRejectedListener) webSocketService.off('offerRejected', offerRejectedListener, 'driver');
      };
      
    } catch (error) {
      console.error('DriverSection: WebSocket setup failed:', error);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    if (isOnline) {
      await loadMyRides();
    }
    setRefreshing(false);
  };

  const handleOnlineToggle = async () => {
    try {
      setLoading(true);
      const newStatus = !isOnline;
      
      console.log('Driver: Toggling online status to:', newStatus);
      
      if (newStatus) {
        // Check KYC status first
        if (kycStatus !== 'approved' && kycStatus !== 'verified') {
          if (kycStatus === null) {
            showToast('Please complete your driver profile first', 'error');
          } else if (kycStatus === 'pending') {
            showToast('Please wait for KYC verification to be approved', 'error');
          } else if (kycStatus === 'rejected') {
            showToast('Your KYC was rejected. Please contact support.', 'error');
          } else {
            showToast('Please complete KYC verification before going online', 'error');
          }
          setLoading(false);
          return;
        }
        
        // Get current location
        try {
          // 1. Connect to WebSocket
          await setupWebSocket();
          if (!webSocketService.isSocketConnected()) {
            throw new Error('WebSocket connection failed.');
          }

          // 2. Get location
          const location = await locationService.getCurrentLocation();
          console.log('Driver: Current location:', location);
          
          // 3. Ping status
          webSocketService.emit('pingStatus', {
            latitude: location.latitude,
            longitude: location.longitude
          }, 'driver');
          const pingSuccess = true; // Assume success for now
          
          if (pingSuccess) {
            setIsOnline(true);
            showToast('You are now online!', 'success');
          } else {
            throw new Error('Failed to update online status.');
          }
        } catch (error: any) {
          console.error('Driver: Failed to go online:', error.message);
          showToast('Failed to go online. Please check your connection and try again.', 'error');
          webSocketService.disconnect(); // Ensure cleanup on failure
        }
      } else {
        // Going offline
        setIsOnline(false);
        showToast('You are now offline', 'info');
      }
    } catch (error) {
      console.error('Driver: Error toggling online status:', error);
      showToast('Error changing online status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeOffer = async (ride: Ride) => {
    // Prevent accepting multiple offers
    if (acceptedOfferId) {
      showToast('You have already accepted an offer. Please complete that ride first.', 'error');
      return;
    }
    
    try {
      console.log('handleMakeOffer called', ride);
      setOfferLoading(prev => ({ ...prev, [ride._id]: true }));
      setLoading(true);
      const offeredPrice = ride.offerPrice || 200;
      await webSocketService.connect('undefined', 'driver');
      console.log('Emitting createRideOffer', { rideId: ride._id, offerAmount: offeredPrice });
      setPendingOfferRideId(ride._id);
      webSocketService.emit('createRideOffer', { rideId: ride._id, offerAmount: offeredPrice });
      setLoading(false);
    } catch (error) {
      console.error('Error in handleMakeOffer:', error);
      showToast('Error submitting offer. Please try again.', 'error');
      setLoading(false);
      setOfferLoading(prev => ({ ...prev, [ride._id]: false }));
    }
  };

  const handleDeclineRide = async (ride: Ride) => {
    try {
      // TODO: Implement decline ride API call
      setAvailableRides(prev => prev.filter(r => r._id !== ride._id));
      showToast('Ride declined', 'info');
    } catch (error) {
      showToast('Error declining ride', 'error');
    }
  };

  const handleStartRide = async () => {
    if (!currentRide) return;
    try {
      const success = await rideService.startRide(currentRide._id);
      if (success) {
        showToast('Ride started!', 'success');
        router.push({
          pathname: "../(common)/rideTracker",
          params: {
            rideId: currentRide._id,
            userRole: userRole, // Add userRole parameter
            passengerName: `${currentRide.passenger ? currentRide.passenger.firstName : ''} ${currentRide.passenger ? currentRide.passenger.lastName : ''}`,
            from: currentRide.pickUpLocation,
            to: currentRide.dropOffLocation,
            fare: currentRide.offerPrice.toString(),
            vehicle: currentRide.vehicleType ? currentRide.vehicleType.name : '',
          },
        });
      } else {
        showToast('Failed to start ride', 'error');
      }
    } catch (error) {
      showToast('Error starting ride', 'error');
    }
  };

  const handleCompleteRide = async () => {
    if (!currentRide) return;
    try {
      const success = await rideService.completeRide(currentRide._id);
      if (success) {
        showToast('Ride completed!', 'success');
        setCurrentRide(null);
      } else {
        showToast('Failed to complete ride', 'error');
      }
    } catch (error) {
      showToast('Error completing ride', 'error');
    }
  };

  const openSidePanel = () => setSidePanelVisible(true);
  const closeSidePanel = () => setSidePanelVisible(false);
  const handleChangeRole = async (newRole: 'driver' | 'passenger') => {
    if (newRole === 'passenger') {
      await userRoleManager.setRole('passenger');
      router.push('/(tabs)');
    } else {
      await userRoleManager.setRole('driver');
      // Optionally navigate to driver dashboard or stay
    }
    closeSidePanel();
  };

  const handleBackPress = () => {
    if (isOnline || loading) {
      setShowBackConfirmation(true);
    } else {
      router.back();
    }
  };

  const handleConfirmBack = () => {
    setShowBackConfirmation(false);
    router.back();
  };

  const handleCancelBack = () => {
    setShowBackConfirmation(false);
  };

  const renderRideItem = ({ item }: { item: Ride }) => (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.passengerInfo}>
          <ProfileImage 
            photoUrl={item.passenger?.photo}
            size={32}
            fallbackIconColor="#333"
            fallbackIconSize={20}
          />
          <Text style={styles.passengerName}>
            {item.passenger ? item.passenger.firstName : ''} {item.passenger ? item.passenger.lastName : ''}
          </Text>
        </View>
        <Text style={styles.ridePrice}>रू{item.offerPrice.toFixed(2)}</Text>
      </View>
      
      <View style={styles.rideDetails}>
        <View style={styles.locationItem}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>Pickup: {item.pickUp?.location || 'N/A'}</Text>
        </View>
        <View style={styles.locationItem}>
          <Navigation size={16} color="#666" />
          <Text style={styles.locationText}>Drop: {item.dropOff?.location || 'N/A'}</Text>
        </View>
        <View style={styles.locationItem}>
          <Car size={16} color="#666" />
          <Text style={styles.locationText}>Vehicle: {item.vehicleType ? item.vehicleType.name : ''}</Text>
        </View>
      </View>
      
      <View style={styles.rideActions}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRide(item)}
          disabled={loading || pendingOfferRideId === item._id}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleMakeOffer(item)}
          disabled={offerLoading[item._id] || loading || acceptedOfferId !== null}
          style={[
            styles.acceptButton, 
            (offerLoading[item._id] || acceptedOfferId !== null) && styles.acceptButtonDisabled
          ]}
        >
          {offerLoading[item._id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : acceptedOfferId !== null ? (
            <Text style={styles.acceptButtonText}>Offer Accepted</Text>
          ) : (
            <Text style={styles.acceptButtonText}>Make Offer</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Periodic location update when online
  useEffect(() => {
    let locationInterval: ReturnType<typeof setInterval>;
    
    if (isOnline) {
      // Update location every 30 seconds when online
      locationInterval = setInterval(async () => {
        try {
          const location = await locationService.getCurrentLocation();
          
          // Only send location ping if driver is online and not in an active ride
          if (webSocketService.isSocketConnected('driver') && isOnline) {
            // Check if driver is in an active ride by checking if we're on the ride tracker screen
            const isInRide = pathname.includes('rideTracker');
            if (!isInRide) {
              webSocketService.emit('pingStatus', {
                latitude: location.latitude,
                longitude: location.longitude
              }, 'driver');
              console.log('Driver: Location updated via WebSocket ping');
            } else {
              console.log('Driver: Skipping location ping - in active ride');
            }
          }
        } catch (error) {
          console.error('Driver: Error updating location in interval:', error);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [isOnline, pathname]);

  const checkKycStatus = async () => {
    try {
      const profileResponse = await apiClient.get('/driver-profile');
      if (profileResponse.data.statusCode === 200) {
        const profile = profileResponse.data.data;
        setKycStatus(profile.kycStatus);
        console.log('Driver: KYC status:', profile.kycStatus);
        return profile.kycStatus;
      }
    } catch (error: any) {
      console.error('Driver: Error checking KYC status:', error);
      if (error.response?.status === 404) {
        setKycStatus(null); // No profile found
      }
    }
    return null;
  };

  // Check KYC status on component mount
  useEffect(() => {
    checkKycStatus();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#075B5E" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Section</Text>
          <TouchableOpacity onPress={openSidePanel} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>


        {/* KYC Not Complete Message */}
        {!kycStatus && (
          <View style={styles.kycIncompleteContainer}>
            <MaterialIcons name="warning" size={20} color="#FF9800" />
            <Text style={styles.kycIncompleteText}>
              Complete your KYC verification to start accepting rides
            </Text>
            <TouchableOpacity 
              style={styles.kycActionButton}
              onPress={() => router.push('/registration')}
              disabled={loading}
            >
              <Text style={styles.kycActionButtonText}>Start KYC</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Map Section */}
        <View style={styles.mapContainer}>
          {currentLocation ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              region={{
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              provider={PROVIDER_GOOGLE}
            >
              {/* Driver's current location */}
              <Marker
                coordinate={{
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                }}
                title="Your Location"
                description="Driver's current position"
              >
                <View style={styles.driverMarker}>
                  <MaterialIcons name="location-on" size={24} color="#075B5E" />
                </View>
              </Marker>

              {/* Available rides markers */}
              {isOnline && availableRides.map((ride, index) => {
                const isMotorcycle = ride.vehicleType?.name?.toLowerCase().includes('bike') || 
                                    ride.vehicleType?.name?.toLowerCase().includes('moto') ||
                                    ride.vehicleType?.name?.toLowerCase().includes('scooter') ||
                                    ride.vehicleType?.name?.toLowerCase().includes('motorcycle');
                
                return (
                  <Marker
                    key={ride._id}
                    coordinate={{
                      latitude: currentLocation.lat + (index * 0.001), // Simulate different locations
                      longitude: currentLocation.lng + (index * 0.001),
                    }}
                    title={`${ride.passenger ? ride.passenger.firstName : ''} ${ride.passenger ? ride.passenger.lastName : ''}`}
                    description={`₹${ride.offerPrice.toFixed(2)}`}
                  >
                    <View style={styles.rideMarker}>
                      <MaterialIcons 
                        name={isMotorcycle ? "motorcycle" : "directions-car"} 
                        size={16} 
                        color="#fff" 
                      />
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Map size={48} color="#ccc" />
              <Text style={styles.mapPlaceholderText}>Loading map...</Text>
            </View>
          )}
        </View>

        {/* Online/Offline Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleCard}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Driver Status</Text>
              <Text style={styles.toggleSubtitle}>
                {isOnline ? 'You are online and receiving rides' : 'Go online to start receiving rides'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleButton, isOnline && styles.toggleButtonActive]}
              onPress={handleOnlineToggle}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, isOnline && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Available Rides (only when online) */}
        {isOnline && (
          <View style={styles.ridesContainer}>
            <View style={styles.ridesHeader}>
              <Text style={styles.ridesTitle}>Available Rides ({availableRides.length})</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <MaterialIcons name="refresh" size={20} color="#075B5E" />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#075B5E" />
                <Text style={styles.loadingText}>Loading rides...</Text>
              </View>
            ) : availableRides.length > 0 ? (
              <FlatList
                data={availableRides}
                renderItem={renderRideItem}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#075B5E']}
                    tintColor="#075B5E"
                  />
                }
              />
            ) : (
              <View style={styles.noRidesContainer}>
                <Car size={48} color="#ccc" />
                <Text style={styles.noRidesText}>No rides available at the moment</Text>
                <Text style={styles.noRidesSubtext}>Stay online to receive ride requests</Text>
              </View>
            )}
          </View>
        )}

        {/* Current Ride (if any) */}
        {currentRide && (
          <View style={styles.currentRideContainer}>
            <Text style={styles.currentRideTitle}>Current Ride</Text>
            <View style={styles.currentRideCard}>
              <Text style={styles.currentRideText}>
                Passenger: {currentRide.passenger ? currentRide.passenger.firstName : ''} {currentRide.passenger ? currentRide.passenger.lastName : ''}
              </Text>
              <Text style={styles.currentRideText}>From: {currentRide.pickUpLocation}</Text>
              <Text style={styles.currentRideText}>To: {currentRide.dropOffLocation}</Text>
              <Text style={styles.currentRideText}>Fare: ₹{currentRide.offerPrice.toFixed(2)}</Text>
              <View style={styles.currentRideActions}>
                <TouchableOpacity style={styles.startButton} onPress={handleStartRide}>
                  <Text style={styles.startButtonText}>Start Ride</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.completeButton} onPress={handleCompleteRide}>
                  <Text style={styles.completeButtonText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Offline Message */}
        {!isOnline && (
          <View style={styles.offlineContainer}>
            <MaterialIcons name="wifi-off" size={48} color="#ccc" />
            <Text style={styles.offlineText}>You are currently offline</Text>
            <Text style={styles.offlineSubtext}>Toggle the switch above to go online and start receiving rides</Text>
          </View>
        )}

        {/* Pending Offers */}
        {pendingOffers.map(ride => (
          <View key={ride._id} style={{ padding: 16, margin: 8, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Waiting for passenger to accept...</Text>
            <ActivityIndicator size="small" color="#075B5E" />
            <Text style={{ marginTop: 8 }}>{ride.pickUp?.location} → {ride.dropOff?.location}</Text>
          </View>
        ))}

        <SidePanel
          visible={sidePanelVisible}
          onClose={closeSidePanel}
          role={role}
          rideInProgress={rideInProgress}
          onChangeRole={handleChangeRole}
        />

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />

        <ConfirmationModal
          visible={showBackConfirmation}
          title={isOnline ? "Go Offline and Leave?" : "Cancel Loading?"}
          message={isOnline ? "You are currently online. Going back will take you offline and you will stop receiving ride requests. Are you sure you want to continue?" : "Driver data is currently loading. Are you sure you want to cancel this process?"}
          confirmText="Go Back"
          cancelText="Stay"
          onConfirm={handleConfirmBack}
          onCancel={handleCancelBack}
          type="warning"
        />

        <ConfirmationModal
          visible={showPassengerCancelledModal}
          title="Passenger Cancelled Ride"
          message="The passenger has cancelled this ride request. You can now accept other offers."
          confirmText="OK"
          cancelText=""
          onConfirm={() => {
            setShowPassengerCancelledModal(false);
            setCancelledRideId(null);
          }}
          onCancel={() => {}}
          type="info"
        />
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 16,
    marginTop: 30,
  },
  backButton: {
    padding: 8,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  menuButton: {
    padding: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#000',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  statusDotOnline: {
    backgroundColor: '#4CAF50',
  },
  mapContainer: {
    height: 250,
    backgroundColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  driverMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 3,
    borderColor: '#075B5E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rideMarker: {
    backgroundColor: '#FF9800',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleContainer: {
    padding: 16,
  },
  toggleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#075B5E',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  ridesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  ridesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ridesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  noRidesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noRidesText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noRidesSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  ridePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#075B5E',
  },
  rideDetails: {
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  rideActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EA2F14',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#EA2F14',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#075B5E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#ccc',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentRideContainer: {
    padding: 16,
  },
  currentRideTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  currentRideCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#075B5E',
  },
  currentRideText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  currentRideActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  offlineText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  offlineSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  kycStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 16,
  },
  kycApproved: {
    borderColor: '#4CAF50',
  },
  kycPending: {
    borderColor: '#FFD700',
  },
  kycRejected: {
    borderColor: '#EA2F14',
  },
  kycStatusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  kycActionButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  kycActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  kycIncompleteContainer: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  kycIncompleteText: {
    color: '#E65100',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
  },
});

export default DriverSection; 