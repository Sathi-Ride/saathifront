import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, BrushCleaning, Star, CarFront } from 'lucide-react-native';
import SidePanel from '../(common)/sidepanel';
import apiClient from '../utils/apiClient';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const router = useRouter();
  const { isAccountRestored: initialRestored, registrationComplete } = useLocalSearchParams();
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [role, setRole] = useState<'driver' | 'passenger'>('driver');
  const [rideInProgress, setRideInProgress] = useState(false);
  const [isAccountRestored, setIsAccountRestored] = useState(false);
  const [vehicleDetails, setVehicleDetails] = useState({ type: '', licensePlate: '', model: '' });
  const [passengerRatings, setPassengerRatings] = useState({ averageRating: 0, totalReviews: 0 });
  const [recentRide, setRecentRide] = useState({ from: '', to: '', date: '', fare: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialRestored === 'true' || registrationComplete === 'true') {
      setIsAccountRestored(true);
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [initialRestored, registrationComplete]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('driver-profile');
      if (response.data.data) {
        const profile = response.data.data;
        setVehicleDetails({
          type: profile.vehicleType?.name || '',
          licensePlate: profile.vehicleRegNum || '',
          model: profile.vehicleModel || '',
        });
        setPassengerRatings({
          averageRating: profile.rating || 0,
          totalReviews: profile.totalRides || 0,
        });
        setRecentRide({
          from: profile.lastRide?.pickupLocation || 'Pickup Location',
          to: profile.lastRide?.dropoffLocation || 'Destination',
          date: profile.lastRide?.date ? new Date(profile.lastRide.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          fare: profile.lastRide?.fare ? `₹${profile.lastRide.fare}` : '₹500',
        });
      } else {
        setIsAccountRestored(false); // Reset if no profile exists
      }
    } catch (err) {
      setIsAccountRestored(false); // Assume no profile on error
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const openSidePanel = () => setSidePanelVisible(true);
  const closeSidePanel = () => setSidePanelVisible(false);
  const handleChangeRole = (newRole: 'driver' | 'passenger') => {
    setRole(newRole);
    if (newRole === 'passenger') router.push('/(tabs)');
    closeSidePanel();
  };

  const handleDriverPress = () => router.push('/registerVehicle');
  const handleAccountPress = () => router.push('/accountRestoration');
  const handlePassengerMode = () => router.push('/(tabs)');

  if (loading) return <Text>Loading...</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.hamburgerButton} onPress={openSidePanel}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.incomeCard}>
          <Text style={styles.incomeTitle}>
            {registrationComplete === 'true' ? 'Welcome to Saathi! 🎉' : 'Tips for drivers'}
          </Text>
          {registrationComplete === 'true' ? (
            <>
              <Text style={styles.welcomeText}>Your driver profile has been created successfully!</Text>
              <Text style={styles.welcomeText}>You can now start accepting rides and earning money.</Text>
            </>
          ) : (
            <>
              <View style={styles.benefitItem}>
                <Clock size={20} color="#333" />
                <Text style={styles.benefitText}>Peak hours are 8-10 AM and 6-8 PM</Text>
              </View>
              <View style={styles.benefitItem}>
                <BrushCleaning size={20} color="#333" />
                <Text style={styles.benefitText}>Keep your vehicle clean</Text>
              </View>
              <View style={styles.benefitItem}>
                <Star size={20} color="#333" />
                <Text style={styles.benefitText}>Maintain good ratings</Text>
              </View>
            </>
          )}
        </View>
        {!isAccountRestored ? (
          <>
            <TouchableOpacity style={styles.driverButton} onPress={handleDriverPress}>
              <View style={styles.driverContent}>
                <View style={styles.carIcon}>
                  <CarFront size={24} color="#333" />
                </View>
                <Text style={styles.driverText}>Driver</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.bottomSection}>
              <TouchableOpacity style={styles.accountButton} onPress={handleAccountPress}>
                <Text style={styles.accountText}>I already have an account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePassengerMode}>
                <Text style={styles.passengerText}>Go to passenger mode</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.vehicleDetailsCard}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <Text style={styles.detailText}>Type: {vehicleDetails.type}</Text>
              <Text style={styles.detailText}>License Plate: {vehicleDetails.licensePlate}</Text>
              <Text style={styles.detailText}>Model: {vehicleDetails.model}</Text>
            </View>
            <View style={styles.ratingsCard}>
              <Text style={styles.sectionTitle}>Passenger Ratings</Text>
              <Text style={styles.detailText}>Average Rating: {passengerRatings.averageRating} / 5</Text>
              <Text style={styles.detailText}>Total Reviews: {passengerRatings.totalReviews}</Text>
            </View>
            <View style={styles.recentRideCard}>
              <Text style={styles.sectionTitle}>Recent Ride</Text>
              <Text style={styles.detailText}>From: {recentRide.from}</Text>
              <Text style={styles.detailText}>To: {recentRide.to}</Text>
              <Text style={styles.detailText}>Date: {recentRide.date}</Text>
              <Text style={styles.detailText}>Fare: {recentRide.fare}</Text>
            </View>
          </>
        )}
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
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  accountButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  accountText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  passengerText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
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
  ratingsCard: {
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
  recentRideCard: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
});

export default HomeScreen;