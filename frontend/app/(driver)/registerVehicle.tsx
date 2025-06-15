import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ChooseVehicle = () => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleClose = () => {
    router.push('/');
  };

  const handleVehicleSelect = (vehicleType: string) => {
    router.push(`/registration?vehicle=${vehicleType}`);
  };

  const vehicles = [
    { id: 'car', name: 'Car', iconName: 'car' },
    { id: 'rickshaw', name: 'Rickshaw', iconName: 'rickshaw' },
    { id: 'motorcycle', name: 'Motorcycle', iconName: 'motorbike' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choose your vehicle</Text>

        <View style={styles.vehicleList}>
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleItem}
              onPress={() => handleVehicleSelect(vehicle.id)}
            >
              <View style={styles.vehicleContent}>
                <View style={styles.vehicleIcon}>
                  <MaterialCommunityIcons name={vehicle.iconName} size={32} color="#333" />
                </View>
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
              </View>
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginTop: 30,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 30,
  },
  closeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 40,
  },
  vehicleList: {
    gap: 16,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    marginRight: 16,
  },
  vehicleEmoji: {
    fontSize: 32,
  },
  vehicleName: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
});

export default ChooseVehicle;