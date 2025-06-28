import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Dimensions, StatusBar, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useDriverRegistration } from '../DriverRegistrationContext';

const { width, height } = Dimensions.get('window');

const License = () => {
  const router = useRouter();
  const { registrationData, updateRegistrationData } = useDriverRegistration();
  const [driverLicensePhoto, setDriverLicensePhoto] = useState<string | null>(registrationData.licenseFrontImgPath || null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<string | null>(registrationData.citizenshipDocFrontImgPath || null);
  const [nationalIdBackPhoto, setNationalIdBackPhoto] = useState<string | null>(registrationData.citizenshipDocBackImgPath || null);
  const [licenseNumber, setLicenseNumber] = useState(registrationData.licenseNum || '');
  const [licenseExpiry, setLicenseExpiry] = useState(registrationData.licenseExpiry || '');
  const [citizenship, setCitizenship] = useState(registrationData.citizenship || '');
  const [citizenshipNumber, setCitizenshipNumber] = useState(registrationData.citizenshipNumber || '');

  const handleAddPhoto = async (type: 'driver_license' | 'national_id_front' | 'national_id_back') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "You need to allow access to your photos to upload an image.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [10, 7],
      quality: 0.8,
      base64: false, // Don't convert to base64 automatically
    });

    if (!pickerResult.canceled) {
      const uri = pickerResult.assets[0].uri;
      console.log(`Selected image for ${type}:`, uri);
      
      if (type === 'driver_license') {
        setDriverLicensePhoto(uri);
      } else if (type === 'national_id_front') {
        setNationalIdPhoto(uri);
      } else {
        setNationalIdBackPhoto(uri);
      }
    }
  };

  const handleNext = () => {
    if (!driverLicensePhoto || !nationalIdPhoto || !nationalIdBackPhoto) {
      Alert.alert('Error', 'Please upload all required photos');
      return;
    }
    if (!licenseNumber.trim() || !licenseExpiry.trim() || !citizenship.trim() || !citizenshipNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(licenseExpiry)) {
      Alert.alert('Error', 'Please enter license expiry date in YYYY-MM-DD format (e.g., 2025-12-31)');
      return;
    }
    
    // Validate date is not in the past
    const expiryDate = new Date(licenseExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      Alert.alert('Error', 'License expiry date cannot be in the past');
      return;
    }
    
    updateRegistrationData({
      ...registrationData,
      licenseFrontImgPath: driverLicensePhoto,
      citizenshipDocFrontImgPath: nationalIdPhoto,
      citizenshipDocBackImgPath: nationalIdBackPhoto,
      licenseNum: licenseNumber,
      licenseExpiry: licenseExpiry,
      citizenship: citizenship,
      citizenshipNumber: citizenshipNumber,
    });
    router.push('/(regSteps)/registerSelfie');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver License</Text>
      </View>
      <View style={styles.content}>
        {/* License Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>License Information</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>License Number</Text>
            <TextInput
              style={styles.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Enter license number"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>License Expiry Date</Text>
            <TextInput
              style={styles.input}
              value={licenseExpiry}
              onChangeText={setLicenseExpiry}
              placeholder="YYYY-MM-DD (e.g., 2025-12-31)"
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>Format: YYYY-MM-DD</Text>
          </View>
        </View>

        {/* Citizenship Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Citizenship Information</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Citizenship Type</Text>
            <TextInput
              style={styles.input}
              value={citizenship}
              onChangeText={setCitizenship}
              placeholder="e.g., Nepali, Foreign"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Citizenship Number</Text>
            <TextInput
              style={styles.input}
              value={citizenshipNumber}
              onChangeText={setCitizenshipNumber}
              placeholder="Enter citizenship number"
            />
          </View>
        </View>

        {/* Driver License Photo */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Front of Driver's License</Text>
          <View style={styles.imagePlaceholder}>
            {driverLicensePhoto ? (
              <Image source={{ uri: driverLicensePhoto }} style={styles.image} />
            ) : (
              <Image
                source={require('../../assets/images/driverlicenseplaceholder.jpg')}
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddPhoto('driver_license')}>
            <Text style={styles.addButtonText}>Add a photo</Text>
          </TouchableOpacity>
        </View>
        
        {/* National ID Front */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>National ID Card (Front Side)</Text>
          <View style={styles.imagePlaceholder}>
            {nationalIdPhoto ? (
              <Image source={{ uri: nationalIdPhoto }} style={styles.image} />
            ) : (
              <Image
                source={require('../../assets/images/nidplaceholder.png')}
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddPhoto('national_id_front')}>
            <Text style={styles.addButtonText}>Add a photo</Text>
          </TouchableOpacity>
        </View>

        {/* National ID Back */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>National ID Card (Back Side)</Text>
          <View style={styles.imagePlaceholder}>
            {nationalIdBackPhoto ? (
              <Image source={{ uri: nationalIdBackPhoto }} style={styles.image} />
            ) : (
              <Image
                source={require('../../assets/images/nidplaceholder.png')}
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddPhoto('national_id_back')}>
            <Text style={styles.addButtonText}>Add a photo</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!driverLicensePhoto || !nationalIdPhoto || !nationalIdBackPhoto || !licenseNumber || !licenseExpiry || !citizenship || !citizenshipNumber) && styles.saveButtonDisabled]}
          onPress={handleNext}
          disabled={!driverLicensePhoto || !nationalIdPhoto || !nationalIdBackPhoto || !licenseNumber || !licenseExpiry || !citizenship || !citizenshipNumber}
        >
          <Text style={[styles.saveButtonText, (!driverLicensePhoto || !nationalIdPhoto || !nationalIdBackPhoto || !licenseNumber || !licenseExpiry || !citizenship || !citizenshipNumber) && styles.saveButtonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  photoSection: {
    marginBottom: 24,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addButton: {
    backgroundColor: '#075B5E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#075B5E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});

export default License;