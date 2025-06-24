import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiClient from '../utils/apiClient';
import { useDriverRegistration } from '../DriverRegistrationContext';

const { width, height } = Dimensions.get('window');

const VehicleInfo = () => {
  const router = useRouter();
  const { registrationData } = useDriverRegistration();
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'brand':
        router.push('/(vehDetails)/vBrand');
        break;
      case 'registrationPlate':
        router.push('/(vehDetails)/regPlate');
        break;
      case 'picture':
        router.push('/(vehDetails)/vPicture');
        break;
      case 'billbook':
        router.push('/(vehDetails)/vBillbook');
        break;
      default:
        break;
    }
  };

  // Example: check if all required fields are present (customize as needed)
  const isComplete = registrationData &&
    registrationData.citizenship &&
    registrationData.citizenshipNumber &&
    registrationData.citizenshipDocFrontImgPath &&
    registrationData.citizenshipDocBackImgPath &&
    registrationData.licenseNum &&
    registrationData.licenseExpiry &&
    registrationData.licenseFrontImgPath &&
    registrationData.vehicleType &&
    registrationData.vehicleRegNum &&
    registrationData.vehicleMake &&
    registrationData.vehicleModel &&
    registrationData.vehicleYear &&
    registrationData.vehicleColor &&
    registrationData.blueBookFrontImgPath &&
    registrationData.blueBookBackImgPath;

  const handleSubmit = () => {
    if (!isComplete) {
      Alert.alert('Error', 'Please complete all registration steps.');
      return;
    }
    router.push('/(regSteps)/reviewAndSubmit');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Info</Text>
        <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.option} onPress={() => handleNavigate('brand')}>
          <Text style={styles.optionText}>Brand</Text>
          <Icon name="chevron-right" size={24} color="#075B5E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => handleNavigate('registrationPlate')}>
          <Text style={styles.optionText}>Registration plate</Text>
          <Icon name="chevron-right" size={24} color="#075B5E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => handleNavigate('picture')}>
          <Text style={styles.optionText}>Picture</Text>
          <Icon name="chevron-right" size={24} color="#075B5E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => handleNavigate('billbook')}>
          <Text style={styles.optionText}>Billbook</Text>
          <Icon name="chevron-right" size={24} color="#075B5E" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.doneButton, (!isComplete || loading) && { backgroundColor: '#ccc' }]}
          onPress={handleSubmit}
          disabled={!isComplete || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.doneButtonText}>Submit Registration</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#075B5E',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default VehicleInfo;