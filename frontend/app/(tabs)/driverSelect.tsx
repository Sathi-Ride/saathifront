"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  SafeAreaView,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter, useLocalSearchParams } from "expo-router"
import Toast from "../../components/ui/Toast"
import { userRoleManager, useUserRole } from "../utils/userRoleManager"

const { width, height } = Dimensions.get("window")

const DriverSelectionScreen = () => {
  const { from, to, fare, vehicle } = useLocalSearchParams()
  const router = useRouter()

  // Get current user role from global manager
  const userRole = useUserRole();

  type Driver = {
    id: string
    name: string
    distance: number
    status: string
    baseFare: number
    rating: number
    vehicleModel: string
    plateNumber: string
  }

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [bargainingDriver, setBargainingDriver] = useState<Driver | null>(null)
  const [bargainFare, setBargainFare] = useState(0)
  const [bargainMessage, setBargainMessage] = useState("")
  const [driverResponse, setDriverResponse] = useState<{ fare: number; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    // Dummy driver data (replace with API call later)
    const dummyDrivers = [
      {
        id: "1",
        name: "Rajesh Kumar",
        distance: 0.5,
        status: "available",
        baseFare: Number.parseFloat(Array.isArray(fare) ? fare[0] : (fare ?? "")),
        rating: 4.8,
        vehicleModel: "Honda City",
        plateNumber: "BA 1 PA 1234",
      },
      {
        id: "2",
        name: "Sita Sharma",
        distance: 1.2,
        status: "available",
        baseFare: Number.parseFloat(Array.isArray(fare) ? fare[0] : (fare ?? "")) * 1.05,
        rating: 4.9,
        vehicleModel: "Maruti Swift",
        plateNumber: "BA 2 CHA 5678",
      },
      {
        id: "3",
        name: "Ram Bahadur",
        distance: 0.8,
        status: "available",
        baseFare: Number.parseFloat(Array.isArray(fare) ? fare[0] : (fare ?? "")),
        rating: 4.7,
        vehicleModel: "Hyundai i20",
        plateNumber: "BA 3 KA 9012",
      },
    ]
    setDrivers(dummyDrivers)
  }, [fare])

  const startBargaining = (driver: Driver) => {
    setBargainingDriver(driver)
    if (driver && typeof driver.baseFare === "number") {
      setBargainFare(driver.baseFare)
    }
    setBargainMessage("")
    setDriverResponse(null)
    showToast(`Started negotiation with ${driver.name}`, 'info');
  }

  const adjustFare = (increase: boolean) => {
    const adjustment = bargainFare * (Math.random() * 0.03 + 0.01) // 1-4%
    setBargainFare((prev) => {
      const newFare = increase ? prev + adjustment : prev - adjustment
      return Math.max(
        Number.parseFloat(Array.isArray(fare) ? fare[0] : (fare ?? "")) * 0.8,
        Math.min(prev * 1.2, newFare),
      ) // Limit 20% range
    })
  }

  const sendBargain = () => {
    if (!bargainMessage.trim()) {
      showToast('Please enter a message', 'error');
      return
    }
    setLoading(true)
    showToast('Sending offer to driver...', 'info');
    
    // Simulate API call to send user's bargain to driver
    setTimeout(() => {
      setLoading(false)
      // Dummy driver response
      const driverAdjustment = bargainFare * (Math.random() * 0.03 + 0.01)
      const driverNewFare = Math.random() > 0.5 ? bargainFare + driverAdjustment : bargainFare - driverAdjustment
      const responses = [
        "Sounds good! Let's go with that fare.",
        "Can we meet in the middle?",
        "That works for me!",
        "How about we adjust it slightly?",
      ]
      const driverMessage = responses[Math.floor(Math.random() * responses.length)]
      setDriverResponse({ fare: driverNewFare, message: driverMessage })
      showToast('Driver responded!', 'success');
    }, 2000)
  }

  const confirmBargain = () => {
    if (!driverResponse) {
      showToast('Please wait for driver response or adjust fare', 'error');
      return
    }
    const finalFare = driverResponse.fare
    if (bargainingDriver) {
      setSelectedDriver({ ...bargainingDriver, baseFare: finalFare })
      setBargainingDriver(null)
      setDriverResponse(null)
      showToast('Ride confirmed!', 'success');
      setTimeout(() => {
        // Use selectedDriver or another ride object as appropriate
        if (selectedDriver) {
        router.push({
          pathname: "../(common)/rideTracker",
          params: { 
              rideId: selectedDriver.id,
              driverName: selectedDriver.name,
              from: from, // or another variable holding pickup location
              to: to,     // or another variable holding dropoff location
              fare: selectedDriver.baseFare,
              vehicle: selectedDriver.vehicleModel,
          },
          });
        }
      }, 1500);
    }
  }

  const cancelBargain = () => {
    setBargainingDriver(null)
    setDriverResponse(null)
    setBargainMessage("")
    showToast('Negotiation cancelled', 'info');
  }

  const renderDriverItem = ({ item }: { item: Driver }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <View style={styles.driverAvatar}>
          <Icon name="person" size={24} color="#075B5E" />
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.name}</Text>
          <View style={styles.driverMeta}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.driverRating}>{item.rating}</Text>
            <Text style={styles.driverDistance}>• {item.distance} km away</Text>
          </View>
          <Text style={styles.vehicleInfo}>
            {item.vehicleModel} • {item.plateNumber}
          </Text>
        </View>
        <View style={styles.driverActions}>
          <Text style={styles.fareText}>₹{item.baseFare.toFixed(2)}</Text>
          {!selectedDriver && !bargainingDriver && (
            <TouchableOpacity style={styles.bargainButton} onPress={() => startBargaining(item)}>
              <Text style={styles.bargainButtonText}>Negotiate</Text>
            </TouchableOpacity>
          )}
          {selectedDriver && selectedDriver.id === item.id && (
            <View style={styles.selectedBadge}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.selectedText}>Selected</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )

  if (bargainingDriver) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#075B5E" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={cancelBargain} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Negotiate Fare</Text>
            <Text style={styles.headerSubtitle}>with {bargainingDriver.name}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.bargainContainer}>
          {/* Driver Info Card */}
          <View style={styles.bargainDriverCard}>
            <View style={styles.bargainDriverInfo}>
              <View style={styles.driverAvatar}>
                <Icon name="person" size={24} color="#075B5E" />
              </View>
              <View>
                <Text style={styles.bargainDriverName}>{bargainingDriver.name}</Text>
                <View style={styles.driverMeta}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.driverRating}>{bargainingDriver.rating}</Text>
                  <Text style={styles.driverDistance}>• {bargainingDriver.distance} km away</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Fare Adjustment */}
          <View style={styles.fareCard}>
            <Text style={styles.fareCardTitle}>Adjust Your Offer</Text>
            <View style={styles.fareControls}>
              <TouchableOpacity style={styles.fareControlButton} onPress={() => adjustFare(false)}>
                <Icon name="remove" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.fareDisplay}>
                <Text style={styles.fareAmount}>₹{bargainFare.toFixed(2)}</Text>
                <Text style={styles.fareLabel}>Your Offer</Text>
              </View>
              <TouchableOpacity style={styles.fareControlButton} onPress={() => adjustFare(true)}>
                <Icon name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Message Input */}
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Add a message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="e.g., Can we meet at this fare?"
              placeholderTextColor="#999"
              value={bargainMessage}
              onChangeText={setBargainMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Driver Response */}
          {driverResponse && (
            <View style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <Icon name="chat-bubble" size={20} color="#075B5E" />
                <Text style={styles.responseTitle}>Driver's Response</Text>
              </View>
              <Text style={styles.responseMessage}>"{driverResponse.message}"</Text>
              <View style={styles.responseFare}>
                <Text style={styles.responseFareLabel}>Counter Offer:</Text>
                <Text style={styles.responseFareAmount}>₹{driverResponse.fare.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelBargain}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            {driverResponse ? (
              <TouchableOpacity style={styles.confirmButton} onPress={confirmBargain}>
                <Text style={styles.confirmButtonText}>Accept & Book</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                onPress={sendBargain}
                disabled={loading}
              >
                <Text style={styles.sendButtonText}>{loading ? "Sending..." : "Send Offer"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
          duration={4000}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075B5E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Available Drivers</Text>
          <Text style={styles.headerSubtitle}>{drivers.length} drivers nearby</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Trip Info */}
      <View style={styles.tripInfo}>
        <View style={styles.tripRoute}>
          <View style={styles.routePoint}>
            <View style={styles.pickupDot} />
            <Text style={styles.routeText} numberOfLines={1}>
              {from}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={styles.dropDot} />
            <Text style={styles.routeText} numberOfLines={1}>
              {to}
            </Text>
          </View>
        </View>
        <View style={styles.tripVehicleInfo}>
          <Icon 
            name={
              (Array.isArray(vehicle) ? vehicle[0] : vehicle)?.toLowerCase().includes('bike')
                ? "motorcycle" 
                : "directions-car"
            } 
            size={20} 
            color="#075B5E" 
          />
          <Text style={styles.vehicleText}>{Array.isArray(vehicle) ? vehicle[0] : vehicle}</Text>
        </View>
      </View>

      {/* Drivers List */}
      <FlatList
        data={drivers}
        renderItem={renderDriverItem}
        keyExtractor={(item) => item.id}
        style={styles.driversList}
        contentContainerStyle={styles.driversListContent}
        showsVerticalScrollIndicator={false}
      />

      {selectedDriver && (
        <View style={styles.proceedContainer}>
          <TouchableOpacity style={styles.proceedButton} onPress={confirmBargain}>
            <Text style={styles.proceedButtonText}>Book Ride with {selectedDriver.name}</Text>
            <Icon name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={4000}
      />
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
  },
  backButton: {
    padding: 8,
    marginTop: 30,
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
    marginTop: 3,
  },
  placeholder: {
    width: 40,
  },
  tripInfo: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tripRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#075B5E",
    marginRight: 12,
  },
  dropDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginRight: 12,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: "#E0E0E0",
    marginLeft: 5,
    marginVertical: 2,
  },
  routeText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  tripVehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  driversList: {
    flex: 1,
    marginTop: 8,
  },
  driversListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  driverDistance: {
    fontSize: 14,
    color: "#666",
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  vehicleText: {
    fontSize: 14,
    color: "#075B5E",
    fontWeight: "500",
    marginLeft: 8,
  },
  driverActions: {
    alignItems: "flex-end",
  },
  fareText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#075B5E",
    marginBottom: 8,
  },
  bargainButton: {
    backgroundColor: "#075B5E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bargainButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectedText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  proceedContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  proceedButton: {
    backgroundColor: "#075B5E",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  proceedButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  // Bargaining screen styles
  bargainContainer: {
    flex: 1,
    padding: 20,
  },
  bargainDriverCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bargainDriverInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  bargainDriverName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  fareCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fareCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  fareControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  fareControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#075B5E",
    justifyContent: "center",
    alignItems: "center",
  },
  fareDisplay: {
    alignItems: "center",
  },
  fareAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#075B5E",
  },
  fareLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    minHeight: 80,
    backgroundColor: "#f8f9fa",
  },
  responseCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#075B5E",
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#075B5E",
    marginLeft: 8,
  },
  responseMessage: {
    fontSize: 16,
    color: "#333",
    fontStyle: "italic",
    marginBottom: 12,
  },
  responseFare: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  responseFareLabel: {
    fontSize: 14,
    color: "#666",
  },
  responseFareAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#075B5E",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f44336",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sendButton: {
    flex: 1,
    backgroundColor: "#075B5E",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default DriverSelectionScreen
