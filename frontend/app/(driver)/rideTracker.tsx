import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from '../../components/ui/Toast';
import { rideService } from '../utils/rideService';
import { locationService } from '../utils/locationService';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const DriverRideTrackerScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const rideId = params.rideId as string;
  const passengerName = params.passengerName as string;
  const from = params.from as string;
  const to = params.to as string;
  const fare = params.fare as string;
  const vehicle = params.vehicle as string;

  const [rideStatus, setRideStatus] = useState<'accepted' | 'in-progress' | 'completed'>('accepted');
  const [progress, setProgress] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [passengerLocation, setPassengerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    initializeTracker();
    startPulseAnimation();
  }, []);

  const initializeTracker = async () => {
    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      setCurrentLocation({ lat: location.latitude, lng: location.longitude });

      // Start location tracking
      await locationService.startLocationTracking((newLocation) => {
        setCurrentLocation({ lat: newLocation.latitude, lng: newLocation.longitude });
      });

      // Set passenger location (mock for now)
      setPassengerLocation({ lat: 27.7172, lng: 85.324 });
    } catch (error) {
      showToast('Error initializing tracker', 'error');
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

  const handleStartRide = async () => {
    setLoading(true);
    showToast('Starting ride...', 'info');

    try {
      const success = await rideService.startRide(rideId);
      if (success) {
        setRideStatus('in-progress');
        showToast('Ride started!', 'success');
        startProgressSimulation();
      } else {
        showToast('Failed to start ride', 'error');
      }
    } catch (error) {
      showToast('Error starting ride', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to complete this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await rideService.completeRide(rideId);
              if (success) {
                setRideStatus('completed');
                showToast('Ride completed!', 'success');
                setTimeout(() => {
                  router.push('/(driver)');
                }, 2000);
              } else {
                showToast('Failed to complete ride', 'error');
              }
            } catch (error) {
              showToast('Error completing ride', 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const startProgressSimulation = () => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 2000);

    return () => clearInterval(timer);
  };

  const handleCallPassenger = () => {
    // TODO: Implement actual phone call functionality
    showToast('Calling passenger...', 'info');
  };

  const handleMessagePassenger = () => {
    showToast('Opening chat with passenger...', 'info');
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'accepted':
        return 'Heading to passenger';
      case 'in-progress':
        return 'Ride in progress';
      case 'completed':
        return 'Ride completed';
      default:
        return 'Ride accepted';
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'accepted':
        return '#FF9800';
      case 'in-progress':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      default:
        return '#FF9800';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075B5E" />

      <View style={styles.mapContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: currentLocation?.lat || 27.7156,
            longitude: currentLocation?.lng || 85.3145,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker
            coordinate={{
              latitude: currentLocation?.lat || 27.7156,
              longitude: currentLocation?.lng || 85.3145,
            }}
            title="Your Location"
            description="Your current location"
          >
            <View style={styles.driverMarker}>
              <MaterialIcons name="directions-car" size={20} color="#075B5E" />
            </View>
          </Marker>
          <Marker
            coordinate={{
              latitude: passengerLocation?.lat || 27.7172,
              longitude: passengerLocation?.lng || 85.324,
            }}
            title="Passenger Location"
            description="Passenger's current location"
          >
            <View style={styles.passengerMarker}>
              <MaterialIcons name="location-on" size={20} color="#4CAF50" />
            </View>
          </Marker>
        </MapView>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Ride Progress</Text>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: getStatusColor(),
                },
              ]}
            />
          </View>
          
          <Text style={styles.progressText}>{progress}% complete</Text>
        </View>

        <View style={styles.rideInfo}>
          <View style={styles.routeInfo}>
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={16} color="#075B5E" />
              <Text style={styles.locationText} numberOfLines={1}>{from}</Text>
            </View>
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={16} color="#EA2F14" />
              <Text style={styles.locationText} numberOfLines={1}>{to}</Text>
            </View>
          </View>
          
          <View style={styles.rideDetails}>
            <Text style={styles.vehicleType}>{vehicle}</Text>
            <Text style={styles.fare}>₹{fare}</Text>
          </View>
        </View>

        <View style={styles.passengerInfo}>
          <Animated.View style={[styles.passengerAvatar, { transform: [{ scale: pulseAnimation }] }]}>
            <MaterialIcons name="person" size={24} color="#075B5E" />
          </Animated.View>
          <View style={styles.passengerDetails}>
            <Text style={styles.passengerName}>{passengerName}</Text>
            <Text style={styles.passengerStatus}>Your passenger</Text>
          </View>
          <View style={styles.passengerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCallPassenger}>
              <MaterialIcons name="phone" size={20} color="#075B5E" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessagePassenger}>
              <MaterialIcons name="message" size={20} color="#075B5E" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rideActions}>
          {rideStatus === 'accepted' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartRide}
              disabled={loading}
            >
              <MaterialIcons name="play-arrow" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start Ride</Text>
            </TouchableOpacity>
          )}
          
          {rideStatus === 'in-progress' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteRide}
              disabled={loading}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.completeButtonText}>Complete Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  rideInfo: {
    marginBottom: 20,
  },
  routeInfo: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleType: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fare: {
    fontSize: 16,
    fontWeight: '700',
    color: '#075B5E',
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  passengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  passengerStatus: {
    fontSize: 14,
    color: '#666',
  },
  passengerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rideActions: {
    marginTop: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DriverRideTrackerScreen; 