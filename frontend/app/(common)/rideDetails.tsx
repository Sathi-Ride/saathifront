"use client"

import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, ScrollView, Alert, ActivityIndicator, Image } from "react-native"
import MapView, { Marker, Polyline } from 'react-native-maps'
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useState, useEffect } from "react"
import { rideService } from '../utils/rideService'
import { useUserRole } from '../utils/userRoleManager'

const { width, height } = Dimensions.get("window")

// Ride interface based on backend response
interface RideDetails {
  _id: string;
  passenger: {
    _id: string;
    firstName: string;
    lastName: string;
    mobile: string;
  };
  driver?: {
    _id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    rating: number;
  };
  vehicleType: {
    _id: string;
    name: string;
    basePrice: number;
    pricePerKm: number;
  };
  pickUp?: {
    location: string;
    coords?: {
      type: string;
      coordinates: number[];
    };
  };
  dropOff?: {
    location: string;
    coords?: {
      type: string;
      coordinates: number[];
    };
  };
  pickUpLocation?: string;
  pickUpLat?: number;
  pickUpLng?: number;
  pickUpTime?: Date;
  dropOffLocation?: string;
  dropOffLat?: number;
  dropOffLng?: number;
  offerPrice: number;
  finalPrice?: number;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
  // Optional fields that might not be present
  estDistance?: {
    distance: {
      text: string; // "4.7 km"
      value: number; // 4700 (meters)
    };
    duration: {
      text: string; // "26 min"
      value: number; // 1560 (seconds)
    };
  };
  progress?: number;
  driverRating?: number;
  passengerRating?: number;
  driverProfile?: {
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    vehicleRegNum: string;
    rating: number;
    totalRides: number;
  };
}

const RideDetailsScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const rideId = params.rideId as string
  const userRole = useUserRole()

  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRideDetails = async () => {
      if (!rideId) {
        setError('Ride ID is required')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        console.log('[RideDetails] Fetching ride details for:', rideId)
        const rideData = await rideService.getRideDetails(rideId)
        console.log('[RideDetails] Received ride details:', rideData)
        
        if (rideData) {
          setRideDetails(rideData)
        } else {
          console.log('[RideDetails] No ride details found, using fallback data')
          setRideDetails(null) // Use fallback data
        }
      } catch (err) {
        console.error('[RideDetails] Error fetching ride details:', err)
        console.log('[RideDetails] Using fallback data due to error')
        setRideDetails(null) // Use fallback data on error
      } finally {
        setLoading(false)
      }
    }

    fetchRideDetails()
  }, [rideId])

  // Extract string values from params (handle arrays) for fallback
  const getString = (val: string | string[] | undefined, defaultVal = "") =>
    Array.isArray(val) ? val[0] || defaultVal : val || defaultVal

  // Fallback data from params if API fails
  const fallbackData = {
    date: getString(params.date, "Unknown Date"),
    from: getString(params.from, "Unknown Location"),
    to: getString(params.to, "Unknown Location"),
    fare: getString(params.fare, "0"),
    driverName: getString(params.driverName, "Unknown Driver"),
    vehicle: getString(params.vehicle, "Unknown Vehicle"),
    vehicleNo: getString(params.vehicleNo, ""),
    status: getString(params.status, "completed"),
    passengerName: getString(params.passengerName, "Unknown Passenger"),
    rating: getString(params.rating, "0"),
    driverRating: getString(params.driverRating, "0"),
    pickupTime: getString(params.pickupTime, ""),
    dropoffTime: getString(params.dropoffTime, ""),
    duration: getString(params.duration, ""),
    distance: getString(params.distance, ""),
    pickupLat: getString(params.pickupLat, "27.7172"),
    pickupLng: getString(params.pickupLng, "85.324"),
    dropoffLat: getString(params.dropoffLat, "27.7089"),
    dropoffLng: getString(params.dropoffLng, "85.3206"),
    vehicleMake: getString(params.vehicleMake, ""),
    vehicleColor: getString(params.vehicleColor, ""),
  }

  const isDriver = userRole === "driver"

  // Use real data if available, otherwise fallback
  const rideData = rideDetails || fallbackData
  const isRealData = !!rideDetails

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Format time for display
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateString
    }
  }

  // Get person name based on role
  const getPersonName = () => {
    if (isRealData) {
      if (isDriver && rideDetails?.passenger) {
        return `${rideDetails.passenger.firstName} ${rideDetails.passenger.lastName}`.trim() || 'Unknown Passenger'
      } else if (!isDriver && rideDetails?.driver) {
        return `${rideDetails.driver.firstName} ${rideDetails.driver.lastName}`.trim() || 'Unknown Driver'
      } else if (!isDriver && !rideDetails?.driver) {
        return 'Driver Not Assigned'
      }
    }
    return isDriver ? fallbackData.passengerName : fallbackData.driverName
  }

  // Get person photo
  const getPersonPhoto = () => {
    // Photo property doesn't exist in the new interface, return null
    return null
  }

  // Get vehicle info
  const getVehicleInfo = () => {
    if (isRealData && rideDetails?.driverProfile) {
      return {
        make: rideDetails.driverProfile.vehicleMake,
        model: rideDetails.driverProfile.vehicleModel,
        color: rideDetails.driverProfile.vehicleColor,
        regNum: rideDetails.driverProfile.vehicleRegNum,
        rating: rideDetails.driverProfile.rating,
        totalRides: rideDetails.driverProfile.totalRides
      }
    }
    return {
      make: fallbackData.vehicle,
      model: fallbackData.vehicleMake || "",
      color: fallbackData.vehicleColor || "",
      regNum: fallbackData.vehicleNo,
      rating: parseFloat(fallbackData.driverRating || fallbackData.rating) || 0,
      totalRides: 0
    }
  }

  // Get locations
  const getLocations = () => {
    if (isRealData && rideDetails) {
      return {
        from: rideDetails.pickUpLocation || rideDetails.pickUp?.location || '',
        to: rideDetails.dropOffLocation || rideDetails.dropOff?.location || '',
        pickupLat: rideDetails.pickUpLat || rideDetails.pickUp?.coords?.coordinates?.[1] || 0,
        pickupLng: rideDetails.pickUpLng || rideDetails.pickUp?.coords?.coordinates?.[0] || 0,
        dropoffLat: rideDetails.dropOffLat || rideDetails.dropOff?.coords?.coordinates?.[1] || 0,
        dropoffLng: rideDetails.dropOffLng || rideDetails.dropOff?.coords?.coordinates?.[0] || 0
      }
    }
    return {
      from: fallbackData.from,
      to: fallbackData.to,
      pickupLat: parseFloat(fallbackData.pickupLat),
      pickupLng: parseFloat(fallbackData.pickupLng),
      dropoffLat: parseFloat(fallbackData.dropoffLat),
      dropoffLng: parseFloat(fallbackData.dropoffLng)
    }
  }

  // Get fare
  const getFare = () => {
    if (isRealData && rideDetails) {
      return rideDetails.offerPrice
    }
    return parseFloat(fallbackData.fare) || 0
  }

  // Get distance and duration
  const getDistanceDuration = () => {
    if (isRealData && rideDetails?.estDistance) {
      return {
        distance: rideDetails.estDistance.distance.text,
        duration: rideDetails.estDistance.duration.text
      }
    }
    return {
      distance: fallbackData.distance || "Unknown",
      duration: fallbackData.duration || "Unknown"
    }
  }

  // Get ride date
  const getRideDate = () => {
    if (isRealData && rideDetails?.createdAt) {
      return formatDate(rideDetails.createdAt.toString())
    }
    return fallbackData.date
  }

  // Get pickup and dropoff times
  const getTimes = () => {
    // startedAt and completedAt don't exist in the new interface, use fallback data
    return {
      pickup: fallbackData.pickupTime,
      dropoff: fallbackData.dropoffTime
    }
  }

  const locations = getLocations()
  const vehicleInfo = getVehicleInfo()
  const fare = getFare()
  const distanceDuration = getDistanceDuration()
  const rideDate = getRideDate()
  const times = getTimes()

  const handleReceipt = () => {
    Alert.alert("Receipt", "Generating PDF receipt...", [
      {
        text: "OK",
        onPress: () => {
          console.log("PDF receipt for ride:", rideDetails)
        },
      },
    ])
  }

  const handleBackPress = () => {
    router.back();
  };
  
  const handleSupport = () => {
    router.push("/support")
  }

  const handleRepeatRide = () => {
    router.push({
      pathname: "/(tabs)",
      params: {
        from: locations.from,
        to: locations.to,
        fare: fare.toString(),
        vehicle: rideDetails?.vehicleType?.name?.includes("MOTOR") ? "Moto" : "Ride",
      },
    })
  }

  const handleReturnRoute = () => {
    router.push({
      pathname: "/(tabs)",
      params: {
        from: locations.to,
        to: locations.from,
        fare: fare.toString(),
        vehicle: rideDetails?.vehicleType?.name?.includes("MOTOR") ? "Moto" : "Ride",
      },
    })
  }

  const handleRemoveFromHistory = () => {
    Alert.alert("Remove from History", "Are you sure you want to remove this ride from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          router.back()
        },
      },
    ])
  }

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Details</Text>
          <View style={styles.roleIndicator}>
            <Text style={styles.roleText}>{userRole}</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#075B5E" />
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </View>
    )
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Details</Text>
          <View style={styles.roleIndicator}>
            <Text style={styles.roleText}>{userRole}</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Icon name="error-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with role indicator */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{rideDate}</Text>
        <View style={styles.roleIndicator}>
          <Text style={styles.roleText}>{userRole}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: locations.pickupLat,
              longitude: locations.pickupLng,
              latitudeDelta: Math.abs(locations.pickupLat - locations.dropoffLat) + 0.01,
              longitudeDelta: Math.abs(locations.pickupLng - locations.dropoffLng) + 0.01,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
            pointerEvents="auto"
          >
            {/* Pickup Marker */}
            <Marker
              coordinate={{
                latitude: locations.pickupLat,
                longitude: locations.pickupLng,
              }}
              title="Pickup"
              pinColor="#2196F3"
            />
            {/* Dropoff Marker */}
            <Marker
              coordinate={{
                latitude: locations.dropoffLat,
                longitude: locations.dropoffLng,
              }}
              title="Dropoff"
              pinColor="#4CAF50"
            />
            {/* Route Polyline */}
            <Polyline
              coordinates={[
                { latitude: locations.pickupLat, longitude: locations.pickupLng },
                { latitude: (locations.pickupLat + locations.dropoffLat) / 2, longitude: (locations.pickupLng + locations.dropoffLng) / 2 },
                { latitude: locations.dropoffLat, longitude: locations.dropoffLng }
              ]}
              strokeColor="#2196F3"
              strokeWidth={4}
            />
          </MapView>
        </View>

        {/* Location Details */}
        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={styles.blueDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{locations.from}</Text>
              <Text style={styles.locationTime}>{times.pickup}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <View style={styles.greenDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{locations.to}</Text>
              <Text style={styles.locationTime}>{times.dropoff}</Text>
            </View>
          </View>
        </View>

        {/* Duration & Distance */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{distanceDuration.duration}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="straighten" size={16} color="#666" />
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{distanceDuration.distance}</Text>
          </View>
        </View>

        {/* Driver/Passenger Info - Changes based on role */}
        <View style={styles.personSection}>
          <View style={[styles.personAvatar, isDriver && styles.driverAvatar]}>
            {getPersonPhoto() ? (
              <Image source={{ uri: getPersonPhoto()! }} style={styles.personImage} />
            ) : (
              <Icon name="person" size={24} color={isDriver ? "#075B5E" : "#fff"} />
            )}
          </View>
          <View style={styles.personDetails}>
            {isDriver ? (
              <>
                <Text style={styles.personName}>{getPersonName()}</Text>
                <Text style={styles.personSubtext}>Passenger</Text>
                {rideDetails?.passengerRating && (
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{rideDetails.passengerRating.toFixed(1)}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.personName}>{getPersonName()}</Text>
                {getPersonName() === 'Driver Not Assigned' ? (
                  <Text style={styles.personSubtext}>No driver was assigned to this ride</Text>
                ) : (
                  <>
                    <Text style={styles.personSubtext}>
                      {vehicleInfo.make} {vehicleInfo.model}
                    </Text>
                    <Text style={styles.personSubtext}>{vehicleInfo.regNum}</Text>
                    <View style={styles.ratingRow}>
                      <Icon name="star" size={16} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {vehicleInfo.rating > 0 ? vehicleInfo.rating.toFixed(1) : 'N/A'}
                      </Text>
                      {vehicleInfo.totalRides > 0 && (
                        <Text style={styles.ratingText}> • {vehicleInfo.totalRides} rides</Text>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>

        {/* Action Buttons - Different for driver vs passenger */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleReceipt}>
            <Icon name="receipt" size={24} color="#666" />
            <Text style={styles.actionButtonText}>Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSupport}>
            <Icon name="support-agent" size={24} color="#666" />
            <Text style={styles.actionButtonText}>Support</Text>
          </TouchableOpacity>

          {/* Only show these for passengers */}
          {!isDriver && (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleRepeatRide}>
                <Icon name="refresh" size={24} color="#666" />
                <Text style={styles.actionButtonText}>Repeat ride</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleReturnRoute}>
                <Icon name="swap-horiz" size={24} color="#666" />
                <Text style={styles.actionButtonText}>Return route</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Payment Section - Changes text based on role */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>{isDriver ? "I earned" : "I paid"}</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Fare</Text>
            <Text style={styles.paymentAmount}>Rs {fare.toFixed(2)}</Text>
          </View>

          <View style={styles.totalPaymentRow}>
            <View style={styles.totalPaymentLeft}>
              <Text style={styles.totalPaymentLabel}>{isDriver ? "Total earned" : "Total paid"}</Text>
            </View>
            <Text style={styles.totalPaymentAmount}>Rs {fare.toFixed(2)}</Text>
          </View>
        </View>

        {/* Remove from History */}
        <TouchableOpacity style={styles.removeButton} onPress={handleRemoveFromHistory}>
          <Text style={styles.removeButtonText}>Remove from history</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginLeft: -60, // Compensate for role indicator
  },
  roleIndicator: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#075B5E",
  },
  roleText: {
    fontSize: 12,
    color: "#075B5E",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    height: 250,
    backgroundColor: "#f5f5f5",
  },
  map: {
    flex: 1,
  },
  locationSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  blueDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2196F3",
    marginRight: 12,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    color: "#000",
    fontWeight: "400",
    marginBottom: 2,
  },
  locationTime: {
    fontSize: 14,
    color: "#666",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  statValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  personSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#075B5E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  driverAvatar: {
    backgroundColor: "#f0f0f0",
  },
  personImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  personSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    alignItems: "center",
    flex: 1,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  backButton: {
    padding: 8,
  },
  paymentSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#666",
  },
  paymentAmount: {
    fontSize: 14,
    color: "#000",
  },
  totalPaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  totalPaymentLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalPaymentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  totalPaymentAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  removeButton: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  removeButtonText: {
    fontSize: 14,
    color: "#D32F2F",
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
    textAlign: "center",
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#075B5E",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default RideDetailsScreen
