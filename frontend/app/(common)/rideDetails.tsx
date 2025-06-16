"use client"

import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, ScrollView, Alert } from "react-native"
import { WebView } from "react-native-webview"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter, useLocalSearchParams } from "expo-router"

const { width, height } = Dimensions.get("window")

const RideDetailsScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const {
    date,
    from,
    to,
    fare,
    driverName,
    vehicle,
    vehicleNo,
    status,
    userRole,
    passengerName,
    rating,
    pickupTime,
    dropoffTime,
    duration,
    distance,
  } = params

  // Extract string values from params (handle arrays)
  const getString = (val: string | string[] | undefined, defaultVal = "") =>
    Array.isArray(val) ? val[0] || defaultVal : val || defaultVal

  // Ride details with fallback dummy data
  const rideDetails = {
    date: getString(date, "Sat, 27 Jul 2024"),
    from: getString(from, "Gwarko Karmanasa Marg"),
    to: getString(to, "Kritishree Girls Hostel"),
    fare: getString(fare, "142.00"),
    driverName: getString(driverName, "Sharad Kumar"),
    vehicle: getString(vehicle, "Red MOTOR-BIKE Honda"),
    vehicleNo: getString(vehicleNo, "BAPRA02032PA2362"),
    status: getString(status, "completed"),
    userRole: getString(userRole, "passenger"), // Get from params
    passengerName: getString(passengerName, "John Doe"),
    rating: getString(rating, "4.8"),
    pickupTime: getString(pickupTime, "12:39 pm"),
    dropoffTime: getString(dropoffTime, "01:05 pm"),
    duration: getString(duration, "26 min"),
    distance: getString(distance, "4.7 km"),
  }

  const isDriver = rideDetails.userRole === "driver"

  // Map HTML exactly matching the image design
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ride Route</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width">
        <style>
          #map { width: 100%; height: 100%; }
          html, body { margin: 0; padding: 0; height: 100%; }
          .leaflet-control-container { display: none; }
        </style>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([27.7172, 85.324], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);
          
          // Blue pickup marker (A)
          var pickupIcon = L.divIcon({
            html: '<div style="background: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 10px;">A</div>',
            iconSize: [20, 20],
            className: 'pickup-marker'
          });
          
          // Green destination marker (B)
          var destinationIcon = L.divIcon({
            html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 10px;">B</div>',
            iconSize: [20, 20],
            className: 'destination-marker'
          });
          
          var pickupMarker = L.marker([27.7172, 85.324], {icon: pickupIcon}).addTo(map);
          var destinationMarker = L.marker([27.7089, 85.3206], {icon: destinationIcon}).addTo(map);
          
          // Route line
          var routeLine = L.polyline([
            [27.7172, 85.324],
            [27.7130, 85.320],
            [27.7089, 85.3206]
          ], {color: '#2196F3', weight: 4, opacity: 0.8}).addTo(map);
          
          // Fit map to show both markers with padding
          var group = new L.featureGroup([pickupMarker, destinationMarker]);
          map.fitBounds(group.getBounds().pad(0.15));
        </script>
      </body>
    </html>
  `

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
        from: rideDetails.from,
        to: rideDetails.to,
        fare: rideDetails.fare,
        vehicle: rideDetails.vehicle.includes("MOTOR-BIKE") ? "Moto" : "Ride",
      },
    })
  }

  const handleReturnRoute = () => {
    router.push({
      pathname: "/(tabs)",
      params: {
        from: rideDetails.to,
        to: rideDetails.from,
        fare: rideDetails.fare,
        vehicle: rideDetails.vehicle.includes("MOTOR-BIKE") ? "Moto" : "Ride",
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


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with role indicator */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{rideDetails.date}</Text>
        {/* Debug: Show current role */}
        <View style={styles.roleIndicator}>
          <Text style={styles.roleText}>{rideDetails.userRole}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <WebView
            style={styles.map}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Location Details */}
        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <View style={styles.blueDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{rideDetails.from}</Text>
              <Text style={styles.locationTime}>{rideDetails.pickupTime}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <View style={styles.greenDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{rideDetails.to}</Text>
              <Text style={styles.locationTime}>{rideDetails.dropoffTime}</Text>
            </View>
          </View>
        </View>

        {/* Duration & Distance */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{rideDetails.duration}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="straighten" size={16} color="#666" />
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{rideDetails.distance}</Text>
          </View>
        </View>

        {/* Driver/Passenger Info - Changes based on role */}
        <View style={styles.personSection}>
          <View style={[styles.personAvatar, isDriver && styles.driverAvatar]}>
            <Icon name="person" size={24} color={isDriver ? "#075B5E" : "#fff"} />
          </View>
          <View style={styles.personDetails}>
            {isDriver ? (
              <>
                <Text style={styles.personName}>{rideDetails.passengerName}</Text>
                <Text style={styles.personSubtext}>Passenger</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{rideDetails.rating}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.personName}>{rideDetails.driverName}</Text>
                <Text style={styles.personSubtext}>{rideDetails.vehicle}</Text>
                <Text style={styles.personSubtext}>{rideDetails.vehicleNo}</Text>
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
            <Text style={styles.paymentAmount}>Rs {rideDetails.fare}</Text>
          </View>

          <View style={styles.totalPaymentRow}>
            <View style={styles.totalPaymentLeft}>
              <Text style={styles.totalPaymentLabel}>{isDriver ? "Total earned" : "Total paid"}</Text>
            </View>
            <Text style={styles.totalPaymentAmount}>Rs {rideDetails.fare}</Text>
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
  },
  driverAvatar: {
    backgroundColor: "#f0f0f0",
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
})

export default RideDetailsScreen
