"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Alert } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { setAccessToken } from "../utils/apiClient";

const { width } = Dimensions.get("window")

type SidePanelProps = {
  visible: boolean
  onClose: () => void
  role: "driver" | "passenger"
  rideInProgress: boolean
  onChangeRole: (role: "driver" | "passenger") => void
}

const SidePanel: React.FC<SidePanelProps> = ({ visible, onClose, role, rideInProgress, onChangeRole }) => {
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current
  const router = useRouter()

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -width * 0.75,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [visible, slideAnim])

  const navigateToProfile = () => {
    router.push("/profile")
    onClose()
  }

  const navigateToRideHistory = () => {
    router.push("/rideHistory")
    onClose()
  }

  const navigateToSupport = () => {
    router.push("/support")
    onClose()
  }

  const navigateToRegisterVehicle = () => {
    router.push("/registerVehicle")
    onClose()
  }

  const navigateToNotifications = () => {
    router.push("/notifications")
    onClose()
  }

  const handleLogout = async () => {
    try {
      // Clear access token from apiClient
      setAccessToken('');
      // Clear tokens from AsyncStorage
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      // Navigate to login screen and close side panel
      router.push("/login");
      onClose();
    } catch (err) {
      console.error('Failed to logout:', err);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }

  const handleChangeRole = () => {
    if (!rideInProgress) {
      const newRole = role === "driver" ? "passenger" : "driver"
      onChangeRole(newRole)
      if (newRole === "driver") {
        router.push("/(driver)")
      } else {
        router.push("/(tabs)")
      }
      onClose()
    } else {
      alert("Cannot change role during an active ride.")
    }
  }

  const menuItems =
    role === "driver"
      ? [
          { id: "home", name: "Home", icon: "home", action: onClose },
          { id: "profile", name: "Profile", icon: "person-4", action: navigateToProfile },
          { id: "history", name: "Ride History", icon: "directions-car", action: navigateToRideHistory },
          { id: "support", name: "Support", icon: "contact-support", action: navigateToSupport },
          { id: "register", name: "Register Vehicle", icon: "directions-car", action: navigateToRegisterVehicle },
          { id: "notifications", name: "Notifications", icon: "notifications", action: navigateToNotifications },
        ]
      : [
          { id: "home", name: "Home", icon: "home", action: onClose },
          { id: "history", name: "Trip History", icon: "directions-car", action: navigateToRideHistory },
          { id: "profile", name: "Profile", icon: "person-4", action: navigateToProfile },
          { id: "notifications", name: "Notifications", icon: "notifications", action: navigateToNotifications },
          { id: "support", name: "Support", icon: "contact-support", action: navigateToSupport },
        ]

  if (!visible) return null

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackground} onPress={onClose} />
      <Animated.View style={[styles.sidePanel, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.sidePanelHeader}>
          <Text style={styles.sidePanelTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuItems}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.action}>
              <Icon name={item.icon} size={24} color="#333" />
              <Text style={styles.menuText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.roleButton, rideInProgress && styles.buttonDisabled]}
            onPress={handleChangeRole}
            disabled={rideInProgress}
          >
            <Text style={styles.buttonText}>{role === "driver" ? "Switch to Passenger" : "Switch to Driver"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#f44336" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  sidePanel: {
    width: width * 0.75,
    backgroundColor: "#fff",
    height: "100%",
    paddingTop: 50,
  },
  sidePanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sidePanelTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  menuItems: {
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bottomButtons: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 20,
  },
  roleButton: {
    backgroundColor: "#075B5E",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoutText: {
    color: "#f44336",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 16,
  },
})

export default SidePanel