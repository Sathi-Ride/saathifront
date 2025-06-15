import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const License = () => {
  const router = useRouter();
  const [driverLicensePhoto, setDriverLicensePhoto] = useState(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState(null);

  const handleAddPhoto = (type: string) => {
    Alert.alert('Add Photo', `Upload ${type} photo`, [
      { text: 'Camera', onPress: () => console.log(`Open camera for ${type}`) },
      { text: 'Gallery', onPress: () => console.log(`Open gallery for ${type}`) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleNext = () => {
    if (!driverLicensePhoto || !nationalIdPhoto) {
      Alert.alert('Error', 'Please upload both driver license and national ID photos');
      return;
    }
    router.push('/(regSteps)/registerSelfie');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver License</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Front of Driver's License</Text>
          <View style={styles.imagePlaceholder}>
            {driverLicensePhoto ? (
              <Image source={{ uri: driverLicensePhoto }} style={styles.image} />
            ) : (
              <Image
                source={require('../../assets/images/driverlicenseplaceholder.jpg')} // Replace with actual placeholder
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddPhoto('driver license')}>
            <Text style={styles.addButtonText}>Add a photo</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>National ID Card (Front Side)</Text>
          <View style={styles.imagePlaceholder}>
            {nationalIdPhoto ? (
              <Image source={{ uri: nationalIdPhoto }} style={styles.image} />
            ) : (
              <Image
                source={require('../../assets/images/nidplaceholder.png')} // Replace with actual placeholder
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddPhoto('national ID')}>
            <Text style={styles.addButtonText}>Add a photo</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, (!driverLicensePhoto || !nationalIdPhoto) && styles.saveButtonDisabled]}
          onPress={handleNext}
          disabled={!driverLicensePhoto || !nationalIdPhoto}
        >
          <Text style={[styles.saveButtonText, (!driverLicensePhoto || !nationalIdPhoto) && styles.saveButtonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#075B5E',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#00809D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    position: 'absolute',
    bottom: 20,
    width: width - 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});

export default License;