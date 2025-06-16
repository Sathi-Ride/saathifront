"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import { userRoleManager } from "../utils/userRoleManager"

const { width, height } = Dimensions.get("window")

const RideHistoryScreen = () => {
  const router = useRouter()

  // Get role from global state manager
  const [userRole, setUserRole] = useState<"driver" | "passenger">(userRoleManager.getRole())

  // Subscribe to role changes
  useEffect(() => {
    const unsubscribe = userRoleManager.subscribe((newRole) => {
      setUserRole(newRole)
    })
    return unsubscribe
  }, [])

  const rideHistory = [
    {
      date: "27 Jul, 12:30 pm",
      from: "Gwarko Karmanasa Marg",
      to: "Kritishree Girls Hostel",
      fare: "142.00",
      status: "completed",
      driverName: "Sharad Kumar",
      vehicle: "Red MOTOR-BIKE Honda",
      vehicleNo: "BAPRAO2032PAA2362",
    },
    {
      date: "4 Jun, 05:38 pm",
      from: "Bafal Marg",
      to: "Kitwosd IT Support Center",
      fare: "75.00",
      status: "completed",
      driverName: "Ramesh Thapa",
      vehicle: "Blue CAR Toyota",
      vehicleNo: "BAPRAO1234PAA5678",
    },
    {
      date: "4 Jun, 03:58 pm",
      from: "Manbhawan Bus Stop",
      to: "ANFA Ground",
      fare: "75.00",
      status: "completed",
      driverName: "Sita Sharma",
      vehicle: "Green MOTOR-BIKE Yamaha",
      vehicleNo: "BAPRAO2032PAA2362",
    },
    {
      date: "2 Jun, 08:27 am",
      from: "Gwarko Karmanasa Marg",
      to: "Mahabir Palace Kathmandu",
      fare: "150.00",
      status: "completed",
      driverName: "Hari Prasad",
      vehicle: "Red CAR Hyundai",
      vehicleNo: "BAPRAO2032PAA2362",
    },
    {
      date: "2 Jun, 08:24 am",
      from: "Bafal Marg",
      to: "Mahabir Palace Kathmandu",
      fare: "0.00",
      status: "cancelled",
      driverName: "Anita Gurung",
      vehicle: "Black MOTOR-BIKE Honda",
      vehicleNo: "BAPRAO2032PAA2362",
    },
  ]

  const handleRidePress = (ride: { date: any; from: any; to: any; fare: any; status: any; driverName: any; vehicle: any; vehicleNo: any }) => {
    // Navigate to single details screen with current userRole
    router.push({
      pathname: "/rideDetails",
      params: {
        date: ride.date,
        from: ride.from,
        to: ride.to,
        fare: ride.fare,
        driverName: ride.driverName,
        passengerName: "John Doe", // This should come from ride data
        vehicle: ride.vehicle,
        vehicleNo: ride.vehicleNo,
        status: ride.status,
        userRole: userRole, // Use current role from global state
        rating: "4.8",
        pickupTime: "12:39 pm",
        dropoffTime: "01:05 pm",
        duration: "26 min",
        distance: "4.7 km",
      },
    })
  }

  const handleBackPress = () => {
    router.back();
  };

  const toggleRole = () => {
    const newRole = userRole === "passenger" ? "driver" : "passenger"
    userRoleManager.setRole(newRole)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My rides</Text>
        {/* Debug: Show current role with toggle */}
        <TouchableOpacity style={styles.roleIndicator} onPress={toggleRole}>
          <Text style={styles.roleText}>{userRole}</Text>
          <Icon name="swap-horiz" size={12} color="#075B5E" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
      <View style={styles.rideList}>
        {rideHistory.map((ride, index) => (
          <TouchableOpacity key={index} style={styles.rideItem} onPress={() => handleRidePress(ride)}>
            <View style={styles.rideDetails}>
              <Text style={styles.rideDate}>{ride.date}</Text>
              <View style={styles.locationRow}>
                <Icon name="location-on" size={16} color={ride.status === "cancelled" ? "#666" : "#4CAF50"} />
                <Text style={styles.rideLocation}>{ride.from}</Text>
              </View>
              <View style={styles.locationRow}>
                <Icon name="location-on" size={16} color={ride.status === "cancelled" ? "#666" : "#2196F3"} />
                <Text style={styles.rideLocation}>{ride.to}</Text>
              </View>
              {ride.status === "cancelled" && <Text style={styles.cancelledText}>Driver cancelled</Text>}
            </View>
            <View style={styles.rideFare}>
              <Text style={styles.fareText}>Rs. {ride.fare}</Text>
              <Icon name="chevron-right" size={24} color="#666" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
    marginLeft: -24,
  },
  backButton: {
    padding: 8,
  },
  roleIndicator: {
    flexDirection: "row",
    alignItems: "center",
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
  rideList: {
    paddingHorizontal: 16,
  },
  rideItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rideDetails: {
    flex: 1,
  },
  rideDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rideLocation: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  cancelledText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  rideFare: {
    flexDirection: "row",
    alignItems: "center",
  },
  fareText: {
    fontSize: 16,
    color: "#333",
    marginRight: 8,
  },
})

export default RideHistoryScreen
