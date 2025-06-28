import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import apiClient, { setAccessToken } from '../utils/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from '../../components/ui/Toast';

const VerifyScreen = () => {
  const router = useRouter();
  const { mobile } = useLocalSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleVerify = async () => {
    const otp = code.join('');
    
    if (otp.length !== 6) {
      showToast('Please enter the complete 6-digit code', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const response = await apiClient.post('/auth/verify-otp', { mobile, otp });

      if (response.data.statusCode === 201) {
        await setAccessToken(response.data.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.data.refreshToken || '');
        
        showToast('Login successful!', 'success');
        
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } else {
        showToast('Invalid OTP. Please try again.', 'error');
      }
    } catch (err: any) {
      let errorMessage = 'Failed to verify OTP. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value[0] || '';
    setCode(newCode);

    if (value && index < code.length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendOTP = async () => {
    if (!mobile) {
      showToast('Phone number not found', 'error');
      return;
    }

    try {
      const response = await apiClient.post('/auth/login', { mobile });
      if (response.data.statusCode === 201) {
        showToast('OTP resent successfully! 📱', 'success');
      } else {
        showToast('Failed to resend OTP', 'error');
      }
    } catch (err: any) {
      showToast('Failed to resend OTP. Please try again.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>
          We have sent you a verification code to WhatsApp
        </Text>
        
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={styles.codeInput}
              value={digit}
              onChangeText={(value) => handleKeyPress(index, value)}
              maxLength={1}
              keyboardType="numeric"
              autoFocus={index === 0}
            />
          ))}
        </View>
        
        <Button
          mode="contained"
          style={styles.button}
          onPress={handleVerify}
          disabled={loading || code.some(d => !d)}
          contentStyle={styles.buttonContent}
        >
          {loading ? <ActivityIndicator color="#fff" /> : 'Verify OTP'}
        </Button>

        <TouchableOpacity onPress={resendOTP} style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <Text style={styles.resendLink}>Resend</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.keyboardPlaceholder} />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={4000}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    paddingHorizontal: 16 
  },
  backButton: { 
    padding: 10, 
    marginTop: 40 
  },
  contentContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 25, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textAlign: 'center', 
    color: '#333' 
  },
  subtitle: { 
    fontSize: 15, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 30 
  },
  codeContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 30 
  },
  codeInput: { 
    width: 45, 
    height: 45, 
    borderWidth: 2, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    textAlign: 'center', 
    marginHorizontal: 5, 
    color: '#000',
    fontSize: 18,
    fontWeight: '600'
  },
  button: { 
    width: '100%', 
    backgroundColor: '#00809D', 
    borderRadius: 12 
  },
  buttonContent: { 
    height: 48 
  },
  resendContainer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#00809D',
    fontWeight: '600',
  },
  keyboardPlaceholder: { 
    height: 200 
  },
});

export default VerifyScreen;