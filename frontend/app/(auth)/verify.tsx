import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';

const VerifyScreen = () => {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/(auth)/setup?source=phone');
    }, 2000);
  };

  const handleKeyPress = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>We have sent you a verification code to whatsapp</Text>
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              style={styles.codeInput}
              value={digit}
              onChangeText={(value) => handleKeyPress(index, value)}
              maxLength={1}
              keyboardType="numeric"
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
          {loading ? <ActivityIndicator color="#000" /> : 'Verify'}
        </Button>
      </View>
      <View style={styles.keyboardPlaceholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 10,
    marginTop: 40,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  codeInput: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
    marginHorizontal: 5,
    color: '#000',
  },
  button: {
    width: '100%',
    backgroundColor: '#00809D',
    borderRadius: 12,
    color: '#fff',
  },
  buttonContent: {
    height: 48,
  },
  keyboardPlaceholder: {
    height: 200,
  },
});

export default VerifyScreen;