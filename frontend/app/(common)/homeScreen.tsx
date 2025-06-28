"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import SidePanel from "./sidepanel"
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { MaterialIcons } from '@expo/vector-icons'

export default function HomeScreen() {
  const router = useRouter()
  type LocationType = { coords: { latitude: number; longitude: number } } | null
  const [location, setLocation] = useState<LocationType>(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [sidePanelVisible, setSidePanelVisible] = useState(false)
  const [localRideInProgress, setLocalRideInProgress] = useState(false)

  // Mock location data - replace with real GPS when ready
  useEffect(() => {
    // TODO: Replace with actual location service when backend is ready
    // const getLocation = async () => {
    //   let { status } = await Location.requestForegroundPermissionsAsync();
    //   if (status !== 'granted') {
    //     setErrorMsg('Permission to access location was denied');
    //     return;
    //   }
    //   let location = await Location.getCurrentPositionAsync({});
    //   setLocation(location);
    // };
    // getLocation();

    // Mock location for now
    setLocation({
      coords: {
        latitude: 27.7172,
        longitude: 85.324,
      },
    })
  }, [])

  // Mock ride status check - replace with API call later
  useEffect(() => {
    // TODO: Replace with API call to check ride status
    // const checkRideStatus = async () => {
    //   try {
    //     const response = await fetch('/api/user/ride-status');
    //     const data = await response.json();
    //     setLocalRideInProgress(data.rideInProgress);
    //   } catch (error) {
    //     console.error('Error checking ride status:', error);
    //   }
    // };
    // checkRideStatus();

    // Mock data for now
    setLocalRideInProgress(false)
  }, [])

  const openSidePanel = () => {
    setSidePanelVisible(true)
  }

  const closeSidePanel = () => {
    setSidePanelVisible(false)
  }

  const handleRoleChange = (newRole: "driver" | "passenger") => {
    if (newRole === "driver") {
      router.push("/(driver)")
    } else {
      router.push("/(tabs)")
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.mapContainer}>
        <TouchableOpacity style={styles.hamburgerButton} onPress={openSidePanel}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location?.coords.latitude || 27.7172,
            longitude: location?.coords.longitude || 85.324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker
            coordinate={{
              latitude: location?.coords.latitude || 27.7172,
              longitude: location?.coords.longitude || 85.324,
            }}
            title="Your Location"
          >
            <View style={styles.userMarker}>
              <MaterialIcons name="location-on" size={20} color="#4CAF50" />
            </View>
          </Marker>
        </MapView>
      </View>

      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeTitle}>Welcome!</Text>
        <Text style={styles.welcomeSubtitle}>{errorMsg ? errorMsg : "Choose your mode to get started"}</Text>

        <View style={styles.modeButtons}>
          <TouchableOpacity style={styles.modeButton} onPress={() => router.push("/(tabs)")}>
            <Text style={styles.modeButtonText}>🚗 Book a Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modeButton} onPress={() => router.push("/(driver)")}>
            <Text style={styles.modeButtonText}>👨‍💼 Drive & Earn</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SidePanel
        visible={sidePanelVisible}
        onClose={closeSidePanel}
        role="passenger"
        rideInProgress={localRideInProgress}
        onChangeRole={handleRoleChange}
      />
    </SafeAreaView>
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
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: "white",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: "#333",
    marginVertical: 2,
    borderRadius: 1,
  },
  map: {
    flex: 1,
  },
  welcomeContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  modeButtons: {
    gap: 12,
  },
  modeButton: {
    backgroundColor: "#075B5E",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  modeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
})
