"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native"
import { TextInput } from "react-native-paper"
import Icon from "react-native-vector-icons/MaterialIcons"
import * as Location from 'expo-location'
import { useRouter, useLocalSearchParams } from "expo-router"
import SidePanel from "../(common)/sidepanel"
import Toast from "../../components/ui/Toast"
import LocationSearch from "../../components/LocationSearch"
import { locationService, LocationData, GoogleMapsPlace } from "../utils/locationService"
import { rideService, VehicleType, RideRequest } from "../utils/rideService"
import { userRoleManager, useUserRole } from "../utils/userRoleManager"
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import MaterialIcons from "react-native-vector-icons/MaterialIcons"

const { width, height } = Dimensions.get("window")

const PassengerHomeScreen = () => {
  const { rideInProgress, driverName, from, to, fare, vehicle, progress: initialProgress } = useLocalSearchParams()
  const getString = (val: string | string[] | undefined) => (Array.isArray(val) ? (val[0] ?? "") : (val ?? ""))

  // Get current user role from global manager
  const userRole = useUserRole();

  // Real state management
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [pickupLocation, setPickupLocation] = useState<string>(getString(from))
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<string>(getString(to))
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [offerPrice, setOfferPrice] = useState<string>(getString(fare))
  const [loading, setLoading] = useState(false)
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null)
  const [sidePanelVisible, setSidePanelVisible] = useState(false)
  const router = useRouter()
  const [localRideInProgress, setLocalRideInProgress] = useState(rideInProgress === "true")
  const [progress, setProgress] = useState(Number.parseInt(initialProgress as string) || 0)
  const [localDriverName, setLocalDriverName] = useState(getString(driverName) || "")
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

  // Initialize location and vehicle types
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Get current location
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);

      // Get vehicle types from API
      const types = await rideService.getVehicleTypes();
      setVehicleTypes(types);
      
      if (types.length > 0) {
        setSelectedVehicleType(types[0]); // Set first vehicle type as default
      }

      // Start location tracking for passenger
      await locationService.startLocationTracking((newLocation) => {
        setCurrentLocation(newLocation);
      }, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 50,
        role: 'passenger'
      });

    } catch (error) {
      showToast('Error initializing app', 'error');
    }
  };

  // Handle pickup location selection
  const handlePickupLocationSelect = (place: GoogleMapsPlace) => {
    setPickupLocation(place.name);
    // Use actual coordinates from the place data
    if (place.location) {
      setPickupCoords({ lat: place.location.lat, lng: place.location.lng });
    } else {
      // Fallback coordinates
      setPickupCoords({ lat: 27.7172, lng: 85.324 });
    }
  };

  // Handle destination location selection
  const handleDestinationLocationSelect = (place: GoogleMapsPlace) => {
    setDestinationLocation(place.name);
    // Use actual coordinates from the place data
    if (place.location) {
      setDestinationCoords({ lat: place.location.lat, lng: place.location.lng });
    } else {
      // Fallback coordinates
      setDestinationCoords({ lat: 27.7089, lng: 85.3206 });
    }
  };

  // Calculate estimated fare
  const calculateEstimatedFare = async () => {
    if (!pickupLocation || !destinationLocation || !selectedVehicleType) {
      console.log('Missing required data for fare calculation:', {
        pickupLocation,
        destinationLocation,
        selectedVehicleType: selectedVehicleType?.name
      });
      return;
    }

    try {
      console.log('Calculating fare with:', {
        pickupLocation,
        destinationLocation,
        pickupCoords,
        destinationCoords,
        vehicleType: selectedVehicleType.name
      });

      const distanceData = await locationService.calculateDistance(
        pickupLocation, 
        destinationLocation,
        pickupCoords || undefined,
        destinationCoords || undefined
      );
      
      console.log('Distance calculation result:', distanceData);
      
      if (distanceData) {
        console.log('Vehicle type for fare calculation:', selectedVehicleType);
        console.log('Distance for fare calculation:', distanceData.distance.value / 1000);
        
        const estimatedFare = rideService.calculateEstimatedFare(
          distanceData.distance.value / 1000, // Convert to km
          selectedVehicleType
        );
        console.log('Estimated fare calculated:', estimatedFare);
        setOfferPrice(estimatedFare.toString());
      } else {
        console.log('No distance data returned');
      }
    } catch (error) {
      console.error('Error calculating fare:', error);
    }
  };

  // Create ride request
  const handleCreateRide = async () => {
    if (!pickupLocation.trim()) {
      showToast('Please select pickup location', 'error');
      return;
    }

    if (!destinationLocation.trim()) {
      showToast('Please select destination', 'error');
      return;
    }

    if (!selectedVehicleType) {
      showToast('Please select a vehicle type', 'error');
      return;
    }

    if (!pickupCoords || !destinationCoords) {
      showToast('Please select valid locations', 'error');
      return;
    }

    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      showToast('Please enter a valid offer price', 'error');
      return;
    }

    setLoading(true);
    showToast('Creating ride request...', 'info');

    try {
      // Ensure coordinates are valid numbers
      const pickUpLat = Number(pickupCoords.lat);
      const pickUpLng = Number(pickupCoords.lng);
      const dropOffLat = Number(destinationCoords.lat);
      const dropOffLng = Number(destinationCoords.lng);

      // Validate coordinates
      if (isNaN(pickUpLat) || isNaN(pickUpLng) || isNaN(dropOffLat) || isNaN(dropOffLng)) {
        showToast('Invalid coordinates. Please select valid locations.', 'error');
        return;
      }

      if (pickUpLat < -90 || pickUpLat > 90 || dropOffLat < -90 || dropOffLat > 90) {
        showToast('Invalid latitude values. Must be between -90 and 90.', 'error');
        return;
      }

      if (pickUpLng < -180 || pickUpLng > 180 || dropOffLng < -180 || dropOffLng > 180) {
        showToast('Invalid longitude values. Must be between -180 and 180.', 'error');
        return;
      }

      const rideData: RideRequest = {
        vehicleType: selectedVehicleType._id,
        pickUpLocation: pickupLocation,
        pickUpLat: pickUpLat,
        pickUpLng: pickUpLng,
        dropOffLocation: destinationLocation,
        dropOffLat: dropOffLat,
        dropOffLng: dropOffLng,
        offerPrice: parseFloat(offerPrice),
      };

      console.log('Creating ride with data:', {
        vehicleType: rideData.vehicleType,
        pickUpLocation: rideData.pickUpLocation,
        pickUpLat: rideData.pickUpLat,
        pickUpLng: rideData.pickUpLng,
        dropOffLocation: rideData.dropOffLocation,
        dropOffLat: rideData.dropOffLat,
        dropOffLng: rideData.dropOffLng,
        offerPrice: rideData.offerPrice,
        pickupCoordsType: typeof pickupCoords.lat,
        destinationCoordsType: typeof destinationCoords.lat,
      });

      const ride = await rideService.createRide(rideData);
      
      if (ride) {
        showToast('Ride request created successfully!', 'success');
        setTimeout(() => {
          router.push({
            pathname: "/(tabs)/rideOffers",
            params: { 
              rideId: ride._id,
              from: pickupLocation,
              to: destinationLocation,
              fare: offerPrice,
              vehicle: selectedVehicleType.name,
            },
          });
        }, 1500);
      } else {
        showToast('Failed to create ride request', 'error');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to create ride request';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mock ride progress simulation - replace with real API calls later
  useEffect(() => {
    let timer: number
    if (localRideInProgress && progress < 100) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer)
            setTimeout(() => {
              router.push({
                pathname: "/rideRate",
                params: {
                  driverName: localDriverName,
                  from: pickupLocation,
                  to: destinationLocation,
                  fare: offerPrice,
                  vehicle: selectedVehicleType?.name || 'Ride',
                },
              })
            }, 1000)
            return 100
          }
          return prev + 5
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [localRideInProgress, progress])

  const handleRoleChange = (newRole: "driver" | "passenger") => {
    if (newRole === "driver") {
      router.push("/(driver)")
    }
  }

  const openRideTracking = () => {
    router.push({
      pathname: "../(common)/rideTracker",
      params: {
        // rideId: ride._id, // Removed because 'ride' is not defined here
        driverName: localDriverName,
        from: pickupLocation,
        to: destinationLocation,
        fare: offerPrice,
        vehicle: selectedVehicleType?.name || 'Ride',
        rideInProgress: localRideInProgress.toString(),
        progress: progress.toString(),
      },
    })
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.mapContainer}>
        {!sidePanelVisible && (
          <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidePanelVisible(true)}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
        )}

        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: currentLocation?.latitude || 27.7172,
            longitude: currentLocation?.longitude || 85.324,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          }}
        >
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Your Location"
              description="This is your current location"
            >
              <View style={styles.userMarker}>
                <MaterialIcons name="location-on" size={20} color="#4CAF50" />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.vehicleContainer}>
          {vehicleTypes.map((vehicleType) => {
            const isMotorcycle = vehicleType.name.toLowerCase().includes('bike') ;
            
            return (
              <TouchableOpacity
                key={vehicleType.name}
                style={[styles.vehicleOption, selectedVehicleType?._id === vehicleType._id && styles.selectedVehicle]}
                onPress={() => setSelectedVehicleType(vehicleType)}
              >
                <View style={styles.vehicleIconContainer}>
                  <Icon 
                    name={isMotorcycle ? "motorcycle" : "directions-car"} 
                    size={24} 
                    color={selectedVehicleType?._id === vehicleType._id ? "#075B5E" : "#666"} 
                  />
                </View>
                <Text
                  style={[
                    styles.vehicleName,
                    selectedVehicleType?._id === vehicleType._id && { color: "#075B5E", fontWeight: "600" },
                  ]}
                >
                  {vehicleType.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <LocationSearch
              placeholder="From (Pickup Location)"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              onLocationSelect={handlePickupLocationSelect}
              iconColor="#075B5E"
            />
          </View>

          <View style={styles.inputRow}>
            <LocationSearch
              placeholder="To (Destination)"
              value={destinationLocation}
              onChangeText={setDestinationLocation}
              onLocationSelect={handleDestinationLocationSelect}
              iconColor="#EA2F14"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              mode="flat"
              placeholder="Offer your fare"
              placeholderTextColor={"#ccc"}
              value={offerPrice}
              onChangeText={setOfferPrice}
              style={styles.fareInput}
              keyboardType="numeric"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
            />
            <TouchableOpacity 
              style={styles.calculateButton}
              onPress={calculateEstimatedFare}
            >
              <Text style={styles.calculateButtonText}>Calculate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.findDriverButton, loading && styles.buttonDisabled]}
          onPress={handleCreateRide}
          disabled={loading}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Find a driver</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {localRideInProgress && (
        <TouchableOpacity style={styles.miniPlayer} onPress={openRideTracking}>
          <View style={styles.miniPlayerContent}>
            <View style={styles.miniPlayerInfo}>
              <View style={styles.miniPlayerIcon}>
                <Icon name="directions-car" size={16} color="#fff" />
              </View>
              <View style={styles.miniPlayerText}>
                <Text style={styles.miniPlayerTitle}>Ride in Progress</Text>
                <Text style={styles.miniPlayerSubtitle}>
                  {localDriverName} • {progress}% complete
                </Text>
              </View>
            </View>
            <View style={styles.miniPlayerActions}>
              <View style={styles.progressIndicator}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Icon name="keyboard-arrow-up" size={24} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      <SidePanel
        visible={sidePanelVisible}
        onClose={() => setSidePanelVisible(false)}
        role="passenger"
        rideInProgress={localRideInProgress}
        onChangeRole={handleRoleChange}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  hamburgerButton: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 1000,
    backgroundColor: "#fff",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    flex: 1,
    width: width,
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20, // Add space for mini-player
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  vehicleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  vehicleOption: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  selectedVehicle: {
    backgroundColor: "#f0f9ff",
  },
  vehicleIconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  passengerBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  passengerCount: {
    fontSize: 10,
    color: "#666",
    marginLeft: 2,
  },
  vehicleName: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  inputSection: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  searchIcon: {
    marginRight: 16,
  },
  rupeeSymbol: {
    fontSize: 18,
    color: "#333",
    marginRight: 16,
    fontWeight: "500",
  },
  locationInput: {
    flex: 1,
    backgroundColor: "transparent",
    fontSize: 16,
  },
  fareInput: {
    flex: 1,
    backgroundColor: "transparent",
    fontSize: 16,
  },
  inputContent: {
    paddingHorizontal: 0,
  },
  findDriverButton: {
    backgroundColor: "#075B5E",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  miniPlayer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#075B5E",
    paddingHorizontal: 20,
    paddingVertical: 25,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 1000,
  },
  miniPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniPlayerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  miniPlayerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  miniPlayerText: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  miniPlayerSubtitle: {
    color: "#B8E6E8",
    fontSize: 12,
  },
  miniPlayerActions: {
    alignItems: "center",
    gap: 8,
  },
  progressIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  calculateButton: {
    backgroundColor: "#075B5E",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  calculateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
})

export default PassengerHomeScreen
