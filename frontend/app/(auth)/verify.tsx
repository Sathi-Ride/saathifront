import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';
import apiClient, { setAccessToken } from '../utils/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VerifyScreen = () => {
  const router = useRouter();
  const { mobile } = useLocalSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const otp = code.join('');
      const response = await apiClient.post('/auth/verify-otp', { mobile, otp });

      if (response.data.statusCode === 201) {
        await setAccessToken(response.data.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.data.refreshToken || '');
        router.replace('/(tabs)');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
      console.error(err);
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

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>We have sent you a verification code to WhatsApp</Text>
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
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          mode="contained"
          style={styles.button}
          onPress={handleVerify}
          disabled={loading || code.some(d => !d)}
          contentStyle={styles.buttonContent}
        >
          {loading ? <ActivityIndicator color="#000" /> : 'Verify'}
        </Button>
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
  codeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  codeInput: { width: 40, height: 40, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, textAlign: 'center', marginHorizontal: 5, color: '#000' },
  error: { color: 'red', marginBottom: 10 },
  button: { width: '100%', backgroundColor: '#00809D', borderRadius: 12 },
  buttonContent: { height: 48 },
  keyboardPlaceholder: { height: 200 },
});

export default VerifyScreen;