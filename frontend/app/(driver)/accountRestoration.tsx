import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const AccountRestoration = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleBack = () => {
    router.back();
  };

  const handleNext = () => {
    // Logic for verification can be added here
    router.push({
      pathname: '/(driver)',
      params: { isAccountRestored: 'true' }, // Pass state via params
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Account restoration</Text>
        <Text style={styles.subtitle}>
          Enter the phone number linked to your previous account
        </Text>

        {/* Phone Input */}
        <View style={styles.phoneContainer}>
          <TouchableOpacity style={styles.countryCodeButton}>
            <Text style={styles.countryCode}>+977</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.phoneInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder=""
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Next Button */}
        <TouchableOpacity 
          style={[styles.nextButton, phoneNumber.length > 0 && styles.nextButtonActive]} 
          onPress={handleNext}
          disabled={phoneNumber.length === 0}
        >
          <Text style={[styles.nextButtonText, phoneNumber.length > 0 && styles.nextButtonTextActive]}>
            Next
          </Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 40,
  },
  phoneContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 40,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  countryCode: {
    fontSize: 16,
    color: '#333',
    marginLeft: 4,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    paddingLeft: 16,
    color: '#333',
  },
  nextButton: {
    backgroundColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonActive: {
    backgroundColor: '#075B5E',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  nextButtonTextActive: {
    color: '#fff',
  },
});

export default AccountRestoration;