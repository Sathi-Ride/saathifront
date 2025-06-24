import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiClient from '../utils/apiClient';
import { useDriverRegistration } from '../DriverRegistrationContext';

const ReviewAndSubmit = () => {
  const router = useRouter();
  const { registrationData } = useDriverRegistration();
  const [loading, setLoading] = useState(false);

  const handleEdit = (step: string) => {
    router.push(step as any);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();

      // Append all text data
      Object.entries(registrationData).forEach(([key, value]) => {
        if (typeof value === 'string' && !key.toLowerCase().includes('image')) {
          formData.append(key, value);
        }
      });
      
      // Append image files
      const imageFields = [
        'profileImage',
        'selfiePhoto',
        'licenseFrontImgPath',
        'citizenshipDocFrontImgPath',
        'vehiclePhoto',
        'blueBookFrontImgPath',
        'blueBookBackImgPath'
      ];

      imageFields.forEach(field => {
        if (registrationData[field]) {
          const uri = registrationData[field];
          const uriParts = uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          formData.append(field, {
            uri,
            name: `${field}.${fileType}`,
            type: `image/${fileType}`,
          } as any);
        }
      });

      await apiClient.post('/driver-profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Driver profile created!', [
        { text: 'OK', onPress: () => router.push('/(driver)') }
      ]);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Error', 'Failed to submit driver profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const imageFields = [
    'profileImage',
    'selfiePhoto',
    'licenseFrontImgPath',
    'citizenshipDocFrontImgPath',
    'vehiclePhoto',
    'blueBookFrontImgPath',
    'blueBookBackImgPath'
  ];

  const renderSection = (
    title: string,
    data: { label: string; value: any; key: string }[],
    editRoute: string
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => handleEdit(editRoute)}>
          <Icon name="edit" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      {data.map((item, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          {imageFields.includes(item.key) && item.value ? (
            <Image source={{ uri: item.value }} style={styles.image} />
          ) : (
            <Text style={styles.value}>{String(item.value)}</Text>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Review & Submit</Text>

      {renderSection('Basic Profile', [
        { label: 'Profile Photo', value: registrationData.profileImage, key: 'profileImage' },
        { label: 'First Name', value: registrationData.firstName, key: 'firstName' },
        { label: 'Last Name', value: registrationData.lastName, key: 'lastName' },
        { label: 'Email', value: registrationData.email, key: 'email' },
        { label: 'City', value: registrationData.city, key: 'city' },
      ], '/(regSteps)/basicProfile')}

      {renderSection('License and ID', [
        { label: 'Driver License', value: registrationData.licenseFrontImgPath, key: 'licenseFrontImgPath' },
        { label: 'National ID', value: registrationData.citizenshipDocFrontImgPath, key: 'citizenshipDocFrontImgPath' },
      ], '/(regSteps)/driverLicense')}
      
      {renderSection('Selfie', [
        { label: 'Selfie with ID', value: registrationData.selfiePhoto, key: 'selfiePhoto' },
      ], '/(regSteps)/registerSelfie')}

      {renderSection('Vehicle Information', [
        { label: 'Brand', value: registrationData.vehicleMake, key: 'vehicleMake' },
        { label: 'Registration Plate', value: registrationData.vehicleRegNum, key: 'vehicleRegNum' },
        { label: 'Vehicle Photo', value: registrationData.vehiclePhoto, key: 'vehiclePhoto' },
        { label: 'Billbook Front', value: registrationData.blueBookFrontImgPath, key: 'blueBookFrontImgPath' },
        { label: 'Billbook Back', value: registrationData.blueBookBackImgPath, key: 'blueBookBackImgPath' },
        { label: 'Billbook Number', value: registrationData.billbookNumber, key: 'billbookNumber' },
      ], '/(vehDetails)/vBrand')}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Registration</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa', 
    padding: 10,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    marginTop: 50,
    textAlign: 'center',
    color: '#333'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  label: { 
    fontWeight: '500', 
    color: '#555',
    fontSize: 16,
  },
  value: { 
    color: '#666', 
    fontSize: 16,
    flexShrink: 1,
    textAlign: 'right',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee'
  },
  submitButton: { 
    backgroundColor: '#075B5E', 
    borderRadius: 25, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600' 
  },
});

export default ReviewAndSubmit; 

