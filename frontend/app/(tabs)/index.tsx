"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, StatusBar, Platform, ScrollView, KeyboardAvoidingView } from "react-native"
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
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps'
import MaterialIcons from "react-native-vector-icons/MaterialIcons"

const { width, height } = Dimensions.get("window")
const MAP_HEIGHT = height * 0.4;

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

  // --- STATE FOR PRICE ADJUSTMENT ---
  const [canAdjustPrice, setCanAdjustPrice] = useState(false);
  const [priceAdjustment, setPriceAdjustment] = useState(0); // -10, -5, 0, +5, +10
  const [adjustUpCount, setAdjustUpCount] = useState(0); // max 2
  const [adjustDownCount, setAdjustDownCount] = useState(0); // max 2

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
      try {
        await locationService.startLocationTracking((newLocation) => {
          setCurrentLocation(newLocation);
        }, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 50,
          role: 'passenger'
        });
      } catch (err) {
        showToast('Location tracking error: ' + ((err as any)?.message || 'Unknown error'), 'error');
      }

    } catch (error) {
      showToast('Location error: ' + ((error as any)?.message || 'Unknown error'), 'error');
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
    setRoutePolyline([]);
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
    setRoutePolyline([]);
  };

  // --- MODIFIED CALCULATE FARE ---
  const calculateEstimatedFare = async () => {
    if (!pickupLocation || !destinationLocation || !selectedVehicleType) {
      console.log('Missing required data for fare calculation:', {
        pickupLocation,
        destinationLocation,
        selectedVehicleType: selectedVehicleType?.name
      });
      showToast('Select pickup and dropoff locations', 'info');
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
        setCanAdjustPrice(true); // Enable price adjustment
        setPriceAdjustment(0); // Reset adjustment
        setAdjustUpCount(0);
        setAdjustDownCount(0);
      } else {
        showToast('Could not calculate distance for fare', 'error');
      }
    } catch (error) {
      showToast('Error calculating fare: ' + ((error as any)?.message || 'Unknown error'), 'error');
    }
  };

  // --- PRICE ADJUSTMENT HANDLERS ---
  const handleAdjustUp = () => {
    if (canAdjustPrice && adjustUpCount < 2) {
      setPriceAdjustment(prev => prev + 5);
      setAdjustUpCount(prev => prev + 1);
      if (adjustDownCount > 0) setAdjustDownCount(0); // Reset down count if going up
    }
  };
  const handleAdjustDown = () => {
    if (canAdjustPrice && adjustDownCount < 2) {
      setPriceAdjustment(prev => prev - 5);
      setAdjustDownCount(prev => prev + 1);
      if (adjustUpCount > 0) setAdjustUpCount(0); // Reset up count if going down
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

    // Check if pickup and destination are the same location
    const pickupLat = Number(pickupCoords.lat);
    const pickupLng = Number(pickupCoords.lng);
    const destLat = Number(destinationCoords.lat);
    const destLng = Number(destinationCoords.lng);
    
    // Calculate distance between pickup and destination using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = (destLat - pickupLat) * Math.PI / 180;
    const dLng = (destLng - pickupLng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pickupLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    if (distance < 0.1) {
      showToast('You cannot have the same pickup and dropoff location', 'error');
      return;
    }
    
    if (pickupLocation.toLowerCase().trim() === destinationLocation.toLowerCase().trim()) {
      showToast('You cannot have the same pickup and dropoff location', 'error');
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

  const KATHMANDU_BOUNDING_BOX = {
    north: 27.85,
    south: 27.60,
    east: 85.55,
    west: 85.20,
  };
  function isInKathmandu(lat: number, lng: number) {
    return lat >= KATHMANDU_BOUNDING_BOX.south && lat <= KATHMANDU_BOUNDING_BOX.north &&
      lng >= KATHMANDU_BOUNDING_BOX.west && lng <= KATHMANDU_BOUNDING_BOX.east;
  }
  const [routePolyline, setRoutePolyline] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Fetch route polyline when both pickup and dropoff are set
  useEffect(() => {
    const fetchRoute = async () => {
      if (!pickupCoords || !destinationCoords) {
        setRoutePolyline([]);
        return;
      }
      // Check if both are in allowed areas
      const inAllowedArea = isInKathmandu(pickupCoords.lat, pickupCoords.lng) && isInKathmandu(destinationCoords.lat, destinationCoords.lng);
      if (!inAllowedArea) {
        setRoutePolyline([]);
        return;
      }
      setLoadingRoute(true);
      try {
        const route = await locationService.getRouteBetweenPoints(
          { lat: pickupCoords.lat, lng: pickupCoords.lng },
          { lat: destinationCoords.lat, lng: destinationCoords.lng }
        );
        const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
          let points = [];
          let index = 0, len = encoded.length;
          let lat = 0, lng = 0;
          while (index < len) {
            let b, shift = 0, result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            shift = 0;
            result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            points.push({
              latitude: lat / 1e5,
              longitude: lng / 1e5
            });
          }
          return points;
        };
        setRoutePolyline(decodePolyline(route.polyline));
        // Optionally fit map to route
        if (mapRef.current && routePolyline.length > 0) {
          const allCoords = [
            { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
            { latitude: destinationCoords.lat, longitude: destinationCoords.lng },
            ...decodePolyline(route.polyline)
          ];
          mapRef.current.fitToCoordinates(allCoords, { edgePadding: { top: 80, bottom: 80, left: 40, right: 40 }, animated: true });
        }
      } catch (e) {
        setRoutePolyline([]);
      }
      setLoadingRoute(false);
    };
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoords, destinationCoords]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>
        {!sidePanelVisible && (
          <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidePanelVisible(true)}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
        )}

        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: currentLocation?.latitude || 27.7172,
            longitude: currentLocation?.longitude || 85.324,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          }}
          minZoomLevel={12}
          maxZoomLevel={17}
          onRegionChangeComplete={(region) => {
            const lat = region.latitude;
            const lng = region.longitude;
            if (!isInKathmandu(lat, lng)) {
              mapRef.current?.animateToRegion({
                latitude: 27.7172,
                longitude: 85.324,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }, 500);
            }
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
          {pickupCoords && (
            <Marker
              coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }}
              title="Pickup"
              pinColor="#075B5E"
            />
          )}
          {destinationCoords && (
            <Marker
              coordinate={{ latitude: destinationCoords.lat, longitude: destinationCoords.lng }}
              title="Dropoff"
              pinColor="#EA2F14"
            />
          )}
          {routePolyline.length > 0 && (
            <Polyline
              coordinates={routePolyline}
              strokeColor="#2196F3"
              strokeWidth={4}
            />
          )}
        </MapView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.bottomSheet}
          contentContainerStyle={[styles.bottomSheetContent, { paddingBottom: 8, flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.vehicleContainer}>
            {vehicleTypes.map((vehicleType) => {
              const isMotorcycle = vehicleType.name.toLowerCase().includes('bike') ;
              
              return (
                <TouchableOpacity
                  key={vehicleType.name}
                  style={[styles.vehicleOption, selectedVehicleType?._id === vehicleType._id && styles.selectedVehicle]}
                  onPress={() => setSelectedVehicleType(vehicleType)}
                  disabled={loading}
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
                disabled={loading}
                boundingBox={KATHMANDU_BOUNDING_BOX}
              />
            </View>

            <View style={styles.inputRow}>
              <LocationSearch
                placeholder="To (Destination)"
                value={destinationLocation}
                onChangeText={setDestinationLocation}
                onLocationSelect={handleDestinationLocationSelect}
                iconColor="#EA2F14"
                disabled={loading}
                boundingBox={KATHMANDU_BOUNDING_BOX}
              />
            </View>

            <View style={styles.inputRow}>
              {/* --- IMPROVED PRICE ADJUSTMENT UI: Rs inside pill, unified row --- */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={styles.priceAdjustRow}>
                  <TouchableOpacity
                    style={[styles.adjustButton, { opacity: canAdjustPrice && adjustDownCount < 2 ? 1 : 0.5 }]}
                    onPress={handleAdjustDown}
                    disabled={!canAdjustPrice || adjustDownCount >= 2}
                  >
                    <Text style={styles.adjustButtonText}>-5</Text>
                  </TouchableOpacity>
                  <View style={styles.pricePill}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>
                      ₹ {offerPrice ? (parseFloat(offerPrice) + priceAdjustment) : '--'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.adjustButton, { opacity: canAdjustPrice && adjustUpCount < 2 ? 1 : 0.5 }]}
                    onPress={handleAdjustUp}
                    disabled={!canAdjustPrice || adjustUpCount >= 2}
                  >
                    <Text style={styles.adjustButtonText}>+5</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.calculateButton, loading && styles.buttonDisabled, { marginLeft: 12 }]} 
                onPress={calculateEstimatedFare}
                disabled={loading}
              >
                <Text style={styles.calculateButtonText}>Calculate</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.findDriverButton, { marginBottom: 32 }, loading && styles.buttonDisabled]}
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
        </ScrollView>
      </KeyboardAvoidingView>

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
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bottomSheetContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    marginBottom: 8,
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
  inputDisabled: {
    opacity: 0.5,
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
  priceAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 10,
  },
  pricePill: {
    minWidth: 80,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButton: {
    backgroundColor: '#075B5E',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 0,
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})

export default PassengerHomeScreen
