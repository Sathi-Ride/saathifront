import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import apiClient from '../utils/apiClient';

const AccountRestoration = () => {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
    } else {
      router.back();
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    setLoading(true);
    try {
      // Send OTP
      const response = await apiClient.post('auth/login', { mobile: phoneNumber });
      if (response.data.statusCode === 201 || response.data.statusCode === 200) {
        setStep('otp');
        Alert.alert('OTP Sent', 'An OTP has been sent to your phone.');
      } else {
        Alert.alert('Error', 'No user exists with this phone number. Please register a vehicle.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Register Vehicle', onPress: () => router.push('/registerVehicle') },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      // Verify OTP
      const response = await apiClient.post('auth/verify-otp', { mobile: phoneNumber, otp });
      if (response.data.statusCode === 201 || response.data.statusCode === 200) {
        const { accessToken } = response.data.data;
        setAccessToken(accessToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        // Fetch driver profile
        try {
          const profileRes = await apiClient.get('driver-profile/');
          if (profileRes.data && profileRes.data.data) {
            // Driver profile exists, go to driver home
            router.push({ pathname: '/(driver)', params: { isAccountRestored: 'true' } });
          } else {
            // No driver profile, prompt to register vehicle
            Alert.alert('No Driver Profile', 'No driver profile found. Please register your vehicle.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Register Vehicle', onPress: () => router.push('/registerVehicle') },
            ]);
          }
        } catch (profileErr: any) {
          // No driver profile, prompt to register vehicle
          Alert.alert('No Driver Profile', 'No driver profile found. Please register your vehicle.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Vehicle', onPress: () => router.push('/registerVehicle') },
          ]);
        }
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {step === 'phone' ? (
          <>
            <Text style={styles.title}>Account restoration</Text>
            <Text style={styles.subtitle}>Enter the phone number linked to your previous account</Text>
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
                editable={!loading}
              />
            </View>
            <TouchableOpacity
              style={[styles.nextButton, phoneNumber.length > 0 && styles.nextButtonActive]}
              onPress={handleSendOtp}
              disabled={phoneNumber.length === 0 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.nextButtonText, phoneNumber.length > 0 && styles.nextButtonTextActive]}>Next</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>Enter the 6-digit OTP sent to your phone</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.nextButton, otp.length === 6 && styles.nextButtonActive]}
              onPress={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.nextButtonText, otp.length === 6 && styles.nextButtonTextActive]}>Verify OTP</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendOtp} disabled={loading} style={{ marginTop: 20 }}>
              <Text style={{ color: '#007AFF', textAlign: 'center' }}>Resend OTP</Text>
            </TouchableOpacity>
          </>
        )}
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
  otpInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    fontSize: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 8,
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