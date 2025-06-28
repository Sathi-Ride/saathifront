import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDriverRegistration } from '../DriverRegistrationContext';

const { width, height } = Dimensions.get('window');

const Brand = () => {
  const router = useRouter();
  const { registrationData, updateRegistrationData } = useDriverRegistration();
  const [brand, setBrand] = useState(registrationData.vehicleMake || '');
  const [model, setModel] = useState(registrationData.vehicleModel || '');
  const [year, setYear] = useState(registrationData.vehicleYear || '');
  const [color, setColor] = useState(registrationData.vehicleColor || '');

  const handleBack = () => {
    router.back();
  };

  const handleDone = () => {
    if (!brand.trim()) {
      Alert.alert('Error', 'Please enter a brand');
      return;
    }
    if (!model.trim()) {
      Alert.alert('Error', 'Please enter a model');
      return;
    }
    if (!year.trim()) {
      Alert.alert('Error', 'Please enter a year');
      return;
    }
    if (!color.trim()) {
      Alert.alert('Error', 'Please enter a color');
      return;
    }
    
    // Validate year range
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2025) {
      Alert.alert('Error', 'Please enter a valid year between 1900 and 2025');
      return;
    }
    
    updateRegistrationData({
      ...registrationData,
      vehicleMake: brand,
      vehicleModel: model,
      vehicleYear: yearNum, // Store as number
      vehicleColor: color,
    });
    router.push('/(vehDetails)/regPlate');
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Brand</Text>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., Honda, Toyota, Suzuki"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Model</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="e.g., Civic, Corolla, Swift"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              placeholder="e.g., 2020"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Color</Text>
            <TextInput
              style={styles.input}
              value={color}
              onChangeText={setColor}
              placeholder="e.g., Red, Blue, White"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.doneButton, (!brand.trim() || !model.trim() || !year.trim() || !color.trim()) && styles.doneButtonDisabled]}
          onPress={handleDone}
          disabled={!brand.trim() || !model.trim() || !year.trim() || !color.trim()}
        >
          <Text style={[styles.doneButtonText, (!brand.trim() || !model.trim() || !year.trim() || !color.trim()) && styles.doneButtonTextDisabled]}>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  doneButton: {
    backgroundColor: '#075B5E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonDisabled: {
    backgroundColor: '#ccc',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  doneButtonTextDisabled: {
    color: '#999',
  },
});

export default Brand;