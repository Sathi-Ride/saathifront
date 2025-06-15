import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar, 
  Dimensions,
  SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CreditCard, Percent } from 'lucide-react-native';
import SidePanel from '../(common)/sidepanel';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const router = useRouter();
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [role, setRole] = useState<'driver' | 'passenger'>('driver'); // Set initial role to driver
  const [rideInProgress, setRideInProgress] = useState(false);

  const openSidePanel = () => {
    setSidePanelVisible(true);
  };

  const closeSidePanel = () => {
    setSidePanelVisible(false);
  };

  const handleChangeRole = (newRole: 'driver' | 'passenger') => {
    setRole(newRole);
    if (newRole === 'passenger') {
      router.push('/(tabs)');
    }
    closeSidePanel();
  };

  // Dummy vehicle details
  const vehicleDetails = {
    type: 'Car',
    licensePlate: 'KA 01 AB 1234',
    model: 'Toyota Corolla',
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header with hamburger menu */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.hamburgerButton} onPress={openSidePanel}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Income Card */}
        <View style={styles.incomeCard}>
          <Text style={styles.incomeTitle}>Get income with us</Text>
          
          <View style={styles.benefitItem}>
            <Clock size={20} color="#333" />
            <Text style={styles.benefitText}>Flexible hours</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <CreditCard size={20} color="#333" />
            <Text style={styles.benefitText}>Your prices</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Percent size={20} color="#333" />
            <Text style={styles.benefitText}>Low service payments</Text>
          </View>
        </View>

        {/* Driver Button */}
        <TouchableOpacity style={styles.driverButton} onPress={() => router.push('/registerVehicle')}>
          <View style={styles.driverContent}>
            <View style={styles.carIcon}>
              <Text style={styles.carEmoji}>🚗</Text>
            </View>
            <Text style={styles.driverText}>Driver</Text>
          </View>
        </TouchableOpacity>

        {/* Vehicle Details Section */}
        <View style={styles.vehicleDetailsCard}>
          <Text style={styles.vehicleTitle}>Vehicle Details</Text>
          <Text style={styles.vehicleText}>Type: {vehicleDetails.type}</Text>
          <Text style={styles.vehicleText}>License Plate: {vehicleDetails.licensePlate}</Text>
          <Text style={styles.vehicleText}>Model: {vehicleDetails.model}</Text>
        </View>
      </View>

      <SidePanel
        visible={sidePanelVisible}
        onClose={closeSidePanel}
        role={role}
        rideInProgress={rideInProgress}
        onChangeRole={handleChangeRole}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  hamburgerButton: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
    marginTop: 30,
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  incomeCard: {
    backgroundColor: '#A4CCD9',
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
  },
  incomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  driverButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carIcon: {
    marginRight: 16,
  },
  carEmoji: {
    fontSize: 24,
  },
  driverText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  vehicleDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  vehicleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
});

export default HomeScreen;