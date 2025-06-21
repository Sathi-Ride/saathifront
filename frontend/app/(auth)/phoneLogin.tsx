import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import apiClient from '../utils/apiClient';

const PhoneLoginScreen = () => {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const mobile = phone.trim();
      const response = await apiClient.post('/auth/login', { mobile });

      if (response.data.statusCode === 201) { // OTP sent successfully
        router.push({
          pathname: '/(auth)/verify',
          params: { mobile }
        });
      } else {
        setError('Unexpected response. Please try again.');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
      console.error(err);
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
        <Text style={styles.title}>Continue with Phone</Text>
        <Text style={styles.subtitle}>Enter your phone number to proceed</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Enter your phone number"
          placeholderTextColor="#ccc"
          autoFocus
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          mode="contained"
          style={styles.button}
          onPress={handleVerify}
          disabled={loading || !phone.trim()}
          contentStyle={styles.buttonContent}
        >
          {loading ? <ActivityIndicator color="#000" /> : 'Verify'}
        </Button>
        <TouchableOpacity onPress={() => router.push('/(auth)/phoneRegister')}>
          <Text style={styles.link}>Don’t have an account? Register</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.keyboardPlaceholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  backButton: { padding: 10, marginTop: 40 },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 25, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 30 },
  input: { width: '100%', height: 48, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, marginBottom: 15, color: '#000' },
  error: { color: 'red', marginBottom: 10 },
  button: { width: '100%', backgroundColor: '#00809D', borderRadius: 12 },
  buttonContent: { height: 48 },
  link: { color: '#00809D', marginTop: 15, textDecorationLine: 'underline' },
  keyboardPlaceholder: { height: 200 },
});

export default PhoneLoginScreen;