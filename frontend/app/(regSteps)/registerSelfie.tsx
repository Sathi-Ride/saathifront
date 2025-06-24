import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useDriverRegistration } from '../DriverRegistrationContext';

const { width, height } = Dimensions.get('window');

const Selfie = () => {
  const router = useRouter();
  const { registrationData, updateRegistrationData } = useDriverRegistration();
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(registrationData.selfiePhoto || null);

  const handleAddPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "You need to allow access to your photos to upload an image.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      setSelfiePhoto(pickerResult.assets[0].uri);
    }
  };

  const handleDone = () => {
    if (!selfiePhoto) {
      Alert.alert('Error', 'Please upload a selfie with your driver license');
      return;
    }
    updateRegistrationData({
      ...registrationData,
      selfiePhoto,
    });
    router.push('/(vehDetails)/vBrand');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selfie with ID</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Selfie with ID (Optional)</Text>
          <View style={styles.imagePlaceholder}>
            {selfiePhoto ? (
              <Image source={{ uri: selfiePhoto }} style={styles.image} />
            ) : (
              <Image
                source={require('../../assets/images/selfiewithid.jpg')} // Replace with actual placeholder
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPhoto}>
            <Text style={styles.addButtonText}>Add a photo</Text>
          </TouchableOpacity>
          <Text style={styles.instructions}>
            Take a selfie with your driver license next to your face. Make sure your face and information on your document are clearly visible.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, !selfiePhoto && styles.saveButtonDisabled]}
          onPress={handleDone}
          disabled={!selfiePhoto}
        >
          <Text style={[styles.saveButtonText, !selfiePhoto && styles.saveButtonTextDisabled]}>
            Done
          </Text>
        </TouchableOpacity>
        <Text style={styles.supportText}>
          If you have questions, please contact Support.
        </Text>
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
    fontStyle: 'italic',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
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
    marginBottom: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#00809D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    position: 'absolute',
    bottom: 20,
    width: 350,
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
  supportText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: '#fff3cd',
    padding: 5,
    borderRadius: 4,
  },
});

export default Selfie;