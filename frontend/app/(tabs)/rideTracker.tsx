"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, SafeAreaView } from "react-native"
import { WebView } from "react-native-webview"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter, useLocalSearchParams } from "expo-router"

const { width, height } = Dimensions.get("window")

const RideTrackingScreen = () => {
  const { driverName, from, to, fare, vehicle, rideInProgress, progress: initialProgress } = useLocalSearchParams()
  const router = useRouter()
  const [progress, setProgress] = useState(Number.parseInt(initialProgress as string) || 0)
  const [currentCoords, setCurrentCoords] = useState([27.7172, 85.324]) // Starting point
  const [estimatedTime, setEstimatedTime] = useState(15) // Mock ETA in minutes

  useEffect(() => {
    let timer: number
    const targetCoords = [27.7089, 85.3206] // Dummy destination
    timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          setTimeout(() => {
            router.push({
              pathname: "/rideRate",
              params: { driverName, from, to, fare, vehicle },
            })
          }, 1000)
          return 100
        }
        const newProgress = prev + 5
        const latStep = (targetCoords[0] - currentCoords[0]) / 20
        const lonStep = (targetCoords[1] - currentCoords[1]) / 20
        setCurrentCoords([currentCoords[0] + latStep, currentCoords[1] + lonStep])

        // Update ETA based on progress
        setEstimatedTime(Math.max(1, Math.round(15 * (1 - newProgress / 100))))

        return newProgress
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [currentCoords, driverName, from, to, fare, vehicle, router])

  const handleBackPress = () => {
    router.push({
      pathname: "/(tabs)",
      params: { rideInProgress: "true", driverName, from, to, fare, vehicle, progress: progress.toString() },
    })
  }

  const getProgressStatus = () => {
    if (progress < 25) return "Driver is on the way"
    if (progress < 50) return "Driver has arrived"
    if (progress < 75) return "Trip in progress"
    if (progress < 100) return "Arriving at destination"
    return "Trip completed"
  }

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ride Tracking</title>
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
          var map = L.map('map').setView([${currentCoords[0]}, ${currentCoords[1]}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);
          
          // Driver marker
          var driverIcon = L.divIcon({
            html: '<div style="background: #075B5E; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="color: white; font-size: 12px;">🚗</div></div>',
            iconSize: [24, 24],
            className: 'driver-marker'
          });
          
          var driverMarker = L.marker([${currentCoords[0]}, ${currentCoords[1]}], {icon: driverIcon}).addTo(map);
          
          // Route line
          var routeLine = L.polyline([
            [27.7172, 85.3240],
            [${currentCoords[0]}, ${currentCoords[1]}],
            [27.7089, 85.3206]
          ], {color: '#075B5E', weight: 4, opacity: 0.7}).addTo(map);
          
          // Destination marker
          var destIcon = L.divIcon({
            html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            className: 'dest-marker'
          });
          L.marker([27.7089, 85.3206], {icon: destIcon}).addTo(map);
          
          map.fitBounds(routeLine.getBounds(), {padding: [20, 20]});
        </script>
      </body>
    </html>
  `

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075B5E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSubtitle}>{getProgressStatus()}</Text>
        </View>
        <TouchableOpacity style={styles.callButton}>
          <Icon name="phone" size={24} color="#075B5E" />
        </TouchableOpacity>
      </View>

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

      {/* Bottom Info Panel */}
      <View style={styles.bottomPanel}>
        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>{progress}% Complete</Text>
            <Text style={styles.etaText}>ETA: {estimatedTime} min</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Icon name="person" size={24} color="#075B5E" />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driverName}</Text>
            <View style={styles.driverMeta}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.driverRating}>4.8</Text>
              <Text style={styles.driverVehicle}>• {vehicle}</Text>
            </View>
          </View>
          <View style={styles.driverActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="phone" size={20} color="#075B5E" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="message" size={20} color="#075B5E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.tripDetails}>
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>From</Text>
              <Text style={styles.locationText}>{from}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, styles.destinationDot]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>To</Text>
              <Text style={styles.locationText}>{to}</Text>
            </View>
          </View>
        </View>

        {/* Fare Info */}
        <View style={styles.fareInfo}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Trip Fare</Text>
            <Text style={styles.fareAmount}>₹{fare}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#f8f9fa",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
    marginTop: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginTop: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#075B5E",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#075B5E",
    marginTop: 2,
  },
  callButton: {
    padding: 8,
    marginTop: 20,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomPanel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  etaText: {
    fontSize: 14,
    color: "#075B5E",
    fontWeight: "500",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#075B5E",
    borderRadius: 3,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverRating: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    marginRight: 8,
  },
  driverVehicle: {
    fontSize: 14,
    color: "#666",
  },
  driverActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  tripDetails: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#075B5E",
    marginTop: 4,
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: "#4CAF50",
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#E0E0E0",
    marginLeft: 5,
    marginVertical: 4,
  },
  locationInfo: {
    flex: 1,
    marginBottom: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  fareInfo: {
    paddingTop: 16,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareLabel: {
    fontSize: 16,
    color: "#666",
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#075B5E",
  },
})

export default RideTrackingScreen
