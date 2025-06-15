"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native"
import { WebView } from "react-native-webview"
import { TextInput } from "react-native-paper"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter, useLocalSearchParams } from "expo-router"
import SidePanel from "../(common)/sidepanel"

const { width, height } = Dimensions.get("window")

const PassengerHomeScreen = () => {
  const { rideInProgress, driverName, from, to, fare, vehicle, progress: initialProgress } = useLocalSearchParams()
  const getString = (val: string | string[] | undefined) => (Array.isArray(val) ? (val[0] ?? "") : (val ?? ""))

  // Local state - no backend dependencies
  const [localFrom, setFrom] = useState<string>(getString(from))
  const [localTo, setTo] = useState<string>(getString(to))
  const [localFare, setFare] = useState<string>(getString(fare))
  const [loading, setLoading] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(getString(vehicle) || "Moto")
  const [sidePanelVisible, setSidePanelVisible] = useState(false)
  const router = useRouter()
  const [localRideInProgress, setLocalRideInProgress] = useState(rideInProgress === "true")
  const [progress, setProgress] = useState(Number.parseInt(initialProgress as string) || 0)
  const [localDriverName, setLocalDriverName] = useState(getString(driverName) || "")

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
                  from: localFrom,
                  to: localTo,
                  fare: localFare,
                  vehicle: selectedVehicle,
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

  // Mock driver search - replace with API call later
  const handleFindDriver = async () => {
    if (!localFrom || !localTo) {
      alert("Please enter From and To locations")
      return
    }

    setLoading(true)

    // TODO: Replace with actual API call
    // const response = await fetch('/api/find-driver', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     from: localFrom,
    //     to: localTo,
    //     vehicle: selectedVehicle,
    //     fare: localFare
    //   })
    // });
    // const data = await response.json();

    // Mock API delay
    setTimeout(() => {
      setLoading(false)
      // Mock fare calculation
      const mockDistance = Math.random() * 10 + 2 // 2-12 km
      const baseFare = mockDistance * (selectedVehicle === "Moto" ? 15 : 25)
      const adjustedFare = baseFare * (1 + (Math.random() * 0.2 - 0.1)) // ±10% variation

      router.push({
        pathname: "/driverSelect",
        params: {
          from: localFrom,
          to: localTo,
          fare: localFare || adjustedFare.toFixed(2),
          vehicle: selectedVehicle,
        },
      })
    }, 2000)
  }

  const selectVehicle = (vehicle: string) => {
    setSelectedVehicle(vehicle)
  }

  const handleRoleChange = (newRole: "driver" | "passenger") => {
    if (newRole === "driver") {
      router.push("/(driver)")
    }
  }

  // Mock location data - replace with real GPS coordinates later
  const demoLocation = {
    latitude: 27.7172,
    longitude: 85.324,
    zoom: 13,
  }

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ride Map</title>
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
          }).setView([${demoLocation.latitude}, ${demoLocation.longitude}], ${demoLocation.zoom});
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);
          var pickupIcon = L.divIcon({
            html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            className: 'custom-marker'
          });
          L.marker([${demoLocation.latitude}, ${demoLocation.longitude}], {icon: pickupIcon}).addTo(map);
          L.marker([27.7089, 85.3206]).addTo(map).bindPopup('Buddha Chowk');
          L.marker([27.7156, 85.3145]).addTo(map).bindPopup('Gachhiya');
        </script>
      </body>
    </html>
  `

  const vehicleOptions = [
    { id: "Moto", name: "Moto", icon: "motorcycle", passengers: 1, color: "#4CAF50" },
    { id: "Ride", name: "Ride", icon: "directions-car", passengers: 4, color: "#2196F3" },
  ]

  const openRideTracking = () => {
    router.push({
      pathname: "/rideTracker",
      params: {
        driverName: localDriverName,
        from: localFrom,
        to: localTo,
        fare: localFare,
        vehicle: selectedVehicle,
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

        <WebView
          style={styles.map}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.vehicleContainer}>
          {vehicleOptions.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[styles.vehicleOption, selectedVehicle === vehicle.id && styles.selectedVehicle]}
              onPress={() => selectVehicle(vehicle.id)}
            >
              <View style={styles.vehicleIconContainer}>
                <Icon name={vehicle.icon} size={24} color={selectedVehicle === vehicle.id ? vehicle.color : "#666"} />
                <View style={styles.passengerBadge}>
                  <Icon name="person" size={12} color="#666" />
                  <Text style={styles.passengerCount}>{vehicle.passengers}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.vehicleName,
                  selectedVehicle === vehicle.id && { color: vehicle.color, fontWeight: "600" },
                ]}
              >
                {vehicle.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <Icon name="search" size={20} color="#075B5E" style={styles.searchIcon} />
            <TextInput
              mode="flat"
              value={localFrom}
              onChangeText={setFrom}
              placeholder="From (Pickup Location)"
              placeholderTextColor={"#ccc"}
              style={styles.locationInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
            />
          </View>

          <View style={styles.inputRow}>
            <Icon name="search" size={20} color="#EA2F14" style={styles.searchIcon} />
            <TextInput
              mode="flat"
              placeholder="To (Destination)"
              placeholderTextColor={"#ccc"}
              value={localTo}
              onChangeText={setTo}
              style={styles.locationInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              mode="flat"
              placeholder="Offer your fare"
              placeholderTextColor={"#ccc"}
              value={localFare}
              onChangeText={setFare}
              style={styles.fareInput}
              keyboardType="numeric"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.findDriverButton, loading && styles.buttonDisabled]}
          onPress={handleFindDriver}
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
})

export default PassengerHomeScreen
