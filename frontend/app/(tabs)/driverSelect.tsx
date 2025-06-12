import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, TextInput, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const DriverSelectionScreen = () => {
  const { from, to, fare, vehicle } = useLocalSearchParams();
  const router = useRouter();
  type Driver = {
    id: string;
    name: string;
    distance: number;
    status: string;
    baseFare: number;
  };
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [bargainingDriver, setBargainingDriver] = useState<Driver | null>(null);
  const [bargainFare, setBargainFare] = useState(0);
  const [bargainMessage, setBargainMessage] = useState('');
  const [driverResponse, setDriverResponse] = useState<{ fare: number; message: string } | null>(null);

  useEffect(() => {
    // Dummy driver data (replace with API call later)
    const dummyDrivers = [
      { id: '1', name: 'John Doe', distance: 0.5, status: 'available', baseFare: parseFloat(Array.isArray(fare) ? fare[0] : fare ?? '') },
      { id: '2', name: 'Jane Smith', distance: 1.2, status: 'available', baseFare: parseFloat(Array.isArray(fare) ? fare[0] : fare ?? '') * 1.05 },
      { id: '3', name: 'Mike Johnson', distance: 0.8, status: 'available', baseFare: parseFloat(Array.isArray(fare) ? fare[0] : fare ?? '') },
    ];
    setDrivers(dummyDrivers);
  }, [fare]);

  const startBargaining = (driver: Driver) => {
    setBargainingDriver(driver);
    if (driver && typeof driver.baseFare === 'number') {
      setBargainFare(driver.baseFare);
    }
    setBargainMessage('');
    setDriverResponse(null);
  };

  const adjustFare = (increase: boolean) => {
    const adjustment = bargainFare * (Math.random() * 0.03 + 0.01); // 1-4%
    setBargainFare(prev => {
      const newFare = increase ? prev + adjustment : prev - adjustment;
      return Math.max(parseFloat(Array.isArray(fare) ? fare[0] : fare ?? '') * 0.8, Math.min(prev * 1.2, newFare)); // Limit 20% range
    });
  };

  const sendBargain = () => {
    if (!bargainMessage.trim()) {
      alert('Please enter a message');
      return;
    }
    // Simulate API call to send user's bargain to driver
    console.log(`Sending to driver: Fare: ${bargainFare.toFixed(2)}, Message: ${bargainMessage}`);
    setTimeout(() => {
      // Dummy driver response
      const driverAdjustment = bargainFare * (Math.random() * 0.03 + 0.01);
      const driverNewFare = Math.random() > 0.5 ? bargainFare + driverAdjustment : bargainFare - driverAdjustment;
      const driverMessage = `Driver response: ${Math.random() > 0.5 ? 'Acceptable' : 'Can you adjust?'} at ${driverNewFare.toFixed(2)}`;
      setDriverResponse({ fare: driverNewFare, message: driverMessage });
    }, 1000);
  };

  const confirmBargain = () => {
    if (!driverResponse) {
      alert('Please wait for driver response or adjust fare');
      return;
    }
    const finalFare = driverResponse.fare;
    if (bargainingDriver) {
      setSelectedDriver({ ...bargainingDriver, baseFare: finalFare });
      setBargainingDriver(null);
      setDriverResponse(null);
      router.push({
        pathname: '/rideTracker',
        params: { driverName: bargainingDriver.name, from, to, fare: finalFare.toFixed(2), vehicle },
      });
    }
  };

  const cancelBargain = () => {
    setBargainingDriver(null);
    setDriverResponse(null);
  };

  const renderDriverItem = ({ item }: { item: Driver }) => (
    <View style={styles.driverItem}>
      <View>
        <Text style={styles.driverName}>{item.name}</Text>
        <Text style={styles.driverDistance}>{item.distance} km away</Text>
        <Text style={styles.driverFare}>Base Fare: Rs{item.baseFare.toFixed(2)}</Text>
      </View>
      {!selectedDriver && !bargainingDriver && (
        <TouchableOpacity style={styles.selectButton} onPress={() => startBargaining(item)}>
          <Text style={styles.selectButtonText}>Bargain</Text>
        </TouchableOpacity>
      )}
      {selectedDriver && selectedDriver.id === item.id && (
        <Text style={styles.selectedText}>Selected</Text>
      )}
    </View>
  );

  if (bargainingDriver) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bargain with {bargainingDriver.name}</Text>
        </View>
        <View style={styles.bargainSection}>
          <Text style={styles.bargainTitle}>Adjust Fare</Text>
          <View style={styles.fareControls}>
            <TouchableOpacity style={styles.fareButton} onPress={() => adjustFare(false)}>
              <Icon name="remove" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fareText}>Rs{bargainFare.toFixed(2)}</Text>
            <TouchableOpacity style={styles.fareButton} onPress={() => adjustFare(true)}>
              <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.messageInput}
            placeholder="Type message to driver..."
            value={bargainMessage}
            onChangeText={setBargainMessage}
            multiline
          />
          {driverResponse && (
            <View style={styles.responseSection}>
              <Text style={styles.responseText}>Driver: {driverResponse.message}</Text>
              <Text style={styles.responseFare}>Proposed Fare: Rs{driverResponse.fare.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelBargain}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            {driverResponse ? (
              <TouchableOpacity style={styles.confirmButton} onPress={confirmBargain}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.bargainButton} onPress={sendBargain}>
                <Text style={styles.bargainButtonText}>Bargain</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Driver</Text>
      </View>
      <FlatList
        data={drivers}
        renderItem={renderDriverItem}
        keyExtractor={(item) => item.id}
        style={styles.driverList}
      />
      {selectedDriver && (
        <TouchableOpacity style={styles.proceedButton} onPress={confirmBargain}>
          <Text style={styles.proceedButtonText}>Proceed to Ride</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
  },
  driverList: {
    paddingHorizontal: 16,
  },
  driverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  driverDistance: {
    fontSize: 14,
    color: '#666',
  },
  driverFare: {
    fontSize: 16,
    color: '#075B5E',
  },
  selectButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  bargainSection: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bargainTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  fareControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fareButton: {
    backgroundColor: '#075B5E',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  fareText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
  },
  messageInput: {
    width: width - 32,
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  responseSection: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    width: width - 32,
  },
  responseText: {
    fontSize: 14,
    color: '#666',
  },
  responseFare: {
    fontSize: 16,
    color: '#075B5E',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 32,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  bargainButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  bargainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  proceedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DriverSelectionScreen;