import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useDriverRegistration } from '../DriverRegistrationContext';
import apiClient from '../utils/apiClient';
import { userRoleManager } from '../utils/userRoleManager';
import Toast from '../../components/ui/Toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const ReviewAndSubmit = () => {
  const { registrationData } = useDriverRegistration();
  const [loading, setLoading] = useState(false);
  const [showBackConfirmation, setShowBackConfirmation] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const handleEdit = (step: string) => {
    if (loading) return;
    router.push(step as any);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleBackPress = () => {
    if (loading) {
      setShowBackConfirmation(true);
    } else {
      router.back();
    }
  };

  const handleConfirmBack = () => {
    setShowBackConfirmation(false);
    router.back();
  };

  const handleCancelBack = () => {
    setShowBackConfirmation(false);
  };

  const handleSubmit = async () => {
    // Validate required fields first
    const requiredFields = [
      'citizenship', 'citizenshipNumber', 'licenseNum', 'licenseExpiry',
      'vehicleType', 'vehicleRegNum', 'vehicleMake', 'vehicleModel',
      'vehicleYear', 'vehicleColor', 'billbookNumber'
    ];
    
    const missingFields = requiredFields.filter(field => !registrationData[field]);
    
    if (missingFields.length > 0) {
      showToast(`Please complete the following fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    setLoading(true);
    try {
      // Helper function to convert file URI to base64
      const convertImageToBase64 = async (imageUri: string): Promise<string> => {
        if (imageUri.startsWith('data:')) {
          // Already base64
          return imageUri;
        } else if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
          try {
            // Convert file URI to base64
            const response = await fetch(imageUri);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result as string;
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            throw new Error(`Failed to convert image: ${imageUri}`);
          }
        } else {
          // Assume it's already a base64 string
          return imageUri;
        }
      };

      // Convert all images to base64
      const imageFields = [
        'citizenshipDocFrontImgPath',
        'citizenshipDocBackImgPath',
        'licenseFrontImgPath',
        'vehiclePhoto',
        'blueBookFrontImgPath',
        'blueBookBackImgPath'
      ];

      const convertedImages: { [key: string]: string } = {};
      
      for (const field of imageFields) {
        if (registrationData[field]) {
          convertedImages[field] = await convertImageToBase64(registrationData[field]);
        }
      }

      // Prepare JSON payload matching Postman format
      const payload = {
        citizenship: String(registrationData.citizenship || ''),
        citizenshipNumber: String(registrationData.citizenshipNumber || ''),
        licenseNum: String(registrationData.licenseNum || ''),
        licenseExpiry: new Date(registrationData.licenseExpiry).toISOString(),
        vehicleType: String(registrationData.vehicleType || ''),
        vehicleRegNum: String(registrationData.vehicleRegNum || ''),
        vehicleMake: String(registrationData.vehicleMake || ''),
        vehicleModel: String(registrationData.vehicleModel || ''),
        vehicleYear: parseInt(registrationData.vehicleYear) || 2020,
        vehicleColor: String(registrationData.vehicleColor || ''),
        billbookNumber: String(registrationData.billbookNumber || ''),
        ...convertedImages
      };

      // Send JSON request instead of FormData
      const response = await apiClient.post('/driver-profile', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Set user role to driver and navigate to home screen
      await userRoleManager.setRole('driver');
      
      showToast('Driver profile created successfully! 🎉', 'success');
      
      // Navigate to driver home screen after a short delay to show the success toast
      setTimeout(() => {
        router.replace('/(driver)?registrationComplete=true');
      }, 1500);

    } catch (err: any) {
      let errorMessage = 'Failed to submit driver profile.';
      if (err.response?.data?.message) {
        const messages = Array.isArray(err.response.data.message) 
          ? err.response.data.message.join(', ')
          : err.response.data.message;
        errorMessage = messages;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showToast(errorMessage, 'error');
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
        <TouchableOpacity onPress={() => handleEdit(editRoute)} disabled={loading}>
          <MaterialIcons name="edit" size={20} color={loading ? "#ccc" : "#007AFF"} />
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
    <View style={styles.container}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
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

          <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Registration</Text>}
          </TouchableOpacity>
        </ScrollView>

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
          duration={4000}
        />

        <ConfirmationModal
          visible={showBackConfirmation}
          title="Cancel Submission?"
          message="You are currently submitting your registration. Are you sure you want to cancel this process?"
          confirmText="Cancel"
          cancelText="Continue"
          onConfirm={handleConfirmBack}
          onCancel={handleCancelBack}
          type="warning"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  image: {
    width: 60,
    height: 40,
    borderRadius: 4,
  },
  submitButton: {
    backgroundColor: '#075B5E',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReviewAndSubmit; 

