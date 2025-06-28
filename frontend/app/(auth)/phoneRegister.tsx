import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import apiClient from '../utils/apiClient';
import Toast from '../../components/ui/Toast';

const PhoneInputScreen = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const validatePhone = (phoneNumber: string) => {
    // Basic phone validation for Nepal numbers
    const phoneRegex = /^(\+977|977)?[9][6-8]\d{8}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  const validateName = (name: string) => {
    return name.trim().length >= 2;
  };

  const handleVerify = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phone.trim();

    // Validation
    if (!trimmedFirstName || !validateName(trimmedFirstName)) {
      showToast('Please enter a valid first name (at least 2 characters)', 'error');
      return;
    }

    if (!trimmedLastName || !validateName(trimmedLastName)) {
      showToast('Please enter a valid last name (at least 2 characters)', 'error');
      return;
    }

    if (!trimmedPhone || !validatePhone(trimmedPhone)) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const response = await apiClient.post('/auth/register', { 
        firstName: trimmedFirstName, 
        lastName: trimmedLastName, 
        mobile: trimmedPhone 
      });

      if (response.data.statusCode === 200) {
        showToast('Phone number already exists. Please log in or use a different number.', 'error');
      } else if (response.data.statusCode === 201) {
        showToast('Registration successful! Please verify your OTP.', 'success');
        setTimeout(() => {
          router.push({
            pathname: '/(auth)/verify',
            params: { mobile: trimmedPhone }
          });
        }, 2000);
      } else {
        showToast('Unexpected response. Please try again.', 'error');
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        showToast('Phone number already exists. Please log in or use a different number.', 'error');
      } else {
        let errorMessage = 'Failed to register. Please try again.';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Join us via phone number</Text>
        <Text style={styles.subtitle}>Enter your details to register</Text>
        
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your First Name"
          placeholderTextColor="#ccc"
          autoFocus
          maxLength={30}
        />
        
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your Last Name"
          placeholderTextColor="#ccc"
          maxLength={30}
        />
        
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Enter your phone number"
          placeholderTextColor="#ccc"
          maxLength={15}
        />
        
        <Button
          mode="contained"
          style={styles.button}
          onPress={handleVerify}
          disabled={loading || !firstName.trim() || !lastName.trim() || !phone.trim()}
          contentStyle={styles.buttonContent}
        >
          {loading ? <ActivityIndicator color="#fff" /> : 'Register'}
        </Button>
        
        <TouchableOpacity onPress={() => router.push('/(auth)/phoneLogin')}>
          <Text style={styles.link}>Already have an account? Log in</Text>
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
  input: { 
    width: '100%', 
    height: 48, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    marginBottom: 15, 
    color: '#000',
    fontSize: 16
  },
  button: { 
    width: '100%', 
    backgroundColor: '#00809D', 
    borderRadius: 12 
  },
  buttonContent: { 
    height: 48 
  },
  link: { 
    color: '#00809D', 
    marginTop: 15, 
    textDecorationLine: 'underline',
    fontSize: 16
  },
  keyboardPlaceholder: { 
    height: 200 
  },
});

export default PhoneInputScreen;