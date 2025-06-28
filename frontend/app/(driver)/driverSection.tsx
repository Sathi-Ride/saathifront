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
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { MapPin, Navigation, Clock, User, Car, Map } from 'lucide-react-native';
import SidePanel from '../(common)/sidepanel';
import Toast from '../../components/ui/Toast';
import { rideService, Ride } from '../utils/rideService';
import { locationService } from '../utils/locationService';
import apiClient from '../utils/apiClient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const DriverSection = () => {
  const router = useRouter();
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [role, setRole] = useState<'driver' | 'passenger'>('driver');
  const [rideInProgress, setRideInProgress] = useState(false);
  
  // Driver mode states
  const [isOnline, setIsOnline] = useState(false);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stopLocationTracking, setStopLocationTracking] = useState<(() => void) | null>(null);
  
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
      loadAvailableRides();
      loadMyRides();
    } else {
      setAvailableRides([]);
      setMyRides([]);
      // Stop location tracking when going offline
      if (stopLocationTracking) {
        stopLocationTracking();
        setStopLocationTracking(null);
      }
    }
  }, [isOnline]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      if (stopLocationTracking) {
        stopLocationTracking();
      }
    };
  }, [stopLocationTracking]);

  const startLocationTracking = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation({ lat: location.latitude, lng: location.longitude });
      
      const stopTracking = await locationService.startLocationTracking((newLocation) => {
        setCurrentLocation({ lat: newLocation.latitude, lng: newLocation.longitude });
      });
      
      // Store the stop function for cleanup
      setStopLocationTracking(() => stopTracking);
    } catch (error) {
      console.warn('Error starting location tracking:', error);
      showToast('Location tracking started (offline mode)', 'info');
    }
  };

  const loadAvailableRides = async () => {
    try {
      setLoading(true);
      console.log('Driver: Loading available rides...');
      
      // Check if driver has a profile first
      try {
        const profileResponse = await apiClient.get('/driver-profile');
        console.log('Driver: Profile check response:', profileResponse.data);
        
        if (profileResponse.data.statusCode !== 200) {
          showToast('Please complete your driver profile first', 'error');
          return;
        }
      } catch (profileError: any) {
        console.error('Driver: Profile check failed:', profileError);
        if (profileError.response?.status === 404) {
          showToast('Please complete your driver profile first', 'error');
          return;
        }
      }
      
      const rides = await rideService.getAllPendingRides();
      console.log('Driver: Received rides from API:', rides);
      setAvailableRides(rides);
      
      if (rides.length > 0) {
        showToast(`Found ${rides.length} available rides`, 'info');
      } else {
        showToast('No rides available at the moment', 'info');
      }
    } catch (error) {
      console.error('Driver: Error loading rides:', error);
      showToast('Error loading rides', 'error');
    } finally {
      setLoading(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    if (isOnline) {
      await loadAvailableRides();
      await loadMyRides();
    }
    setRefreshing(false);
  };

  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    if (value) {
      showToast('You are now online and receiving rides', 'success');
    } else {
      showToast('You are now offline', 'info');
    }
  };

  const handleMakeOffer = async (ride: Ride) => {
    showToast('Making ride offer...', 'info');
    try {
      // Make a ride offer instead of directly accepting
      const offer = await rideService.makeRideOffer(ride._id, ride.offerPrice);
      if (offer) {
        showToast('Ride offer sent! Waiting for passenger response', 'success');
        // Remove from available rides since we've made an offer
        setAvailableRides(prev => prev.filter(r => r._id !== ride._id));
      } else {
        showToast('Failed to make ride offer', 'error');
      }
    } catch (error) {
      showToast('Error making ride offer', 'error');
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
          pathname: "/(driver)/rideTracker",
          params: {
            rideId: currentRide._id,
            passengerName: `${currentRide.passenger.firstName} ${currentRide.passenger.lastName}`,
            from: currentRide.pickUpLocation,
            to: currentRide.dropOffLocation,
            fare: currentRide.offerPrice.toString(),
            vehicle: currentRide.vehicleType.name,
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
  const handleChangeRole = (newRole: 'driver' | 'passenger') => {
    setRole(newRole);
    if (newRole === 'passenger') router.push('/(tabs)');
    closeSidePanel();
  };

  const handleBackPress = () => router.back();

  const renderRideItem = ({ item }: { item: Ride }) => (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.passengerInfo}>
          <User size={20} color="#333" />
          <Text style={styles.passengerName}>
            {item.passenger.firstName} {item.passenger.lastName}
          </Text>
        </View>
        <Text style={styles.ridePrice}>₹{item.offerPrice}</Text>
      </View>
      
      <View style={styles.rideDetails}>
        <View style={styles.locationItem}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>Pickup: {item.pickUpLocation}</Text>
        </View>
        <View style={styles.locationItem}>
          <Navigation size={16} color="#666" />
          <Text style={styles.locationText}>Drop: {item.dropOffLocation}</Text>
        </View>
        <View style={styles.locationItem}>
          <Car size={16} color="#666" />
          <Text style={styles.locationText}>Vehicle: {item.vehicleType.name}</Text>
        </View>
      </View>
      
      <View style={styles.rideActions}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRide(item)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleMakeOffer(item)}
        >
          <Text style={styles.acceptButtonText}>Make Offer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075B5E" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Section</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
        </View>
      </View>

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
                  title={`${ride.passenger.firstName} ${ride.passenger.lastName}`}
                  description={`₹${ride.offerPrice}`}
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
            onPress={() => handleToggleOnline(!isOnline)}
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
              Passenger: {currentRide.passenger.firstName} {currentRide.passenger.lastName}
            </Text>
            <Text style={styles.currentRideText}>From: {currentRide.pickUpLocation}</Text>
            <Text style={styles.currentRideText}>To: {currentRide.dropOffLocation}</Text>
            <Text style={styles.currentRideText}>Fare: ₹{currentRide.offerPrice}</Text>
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
});

export default DriverSection; 