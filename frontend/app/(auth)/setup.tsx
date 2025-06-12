import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSearchParams } from 'expo-router/build/hooks';
import Icon from 'react-native-vector-icons/FontAwesome';

const SetupScreen = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const [name, setName] = useState(source === 'google' ? '' : ''); //Need to be changed with backend-dev consultation
  const [email, setEmail] = useState(source === 'google' ? '' : ''); //Need to be changed with backend-dev consultation
  const [phone, setPhone] = useState('+977 ');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (source === 'phone') {
        router.replace('/(tabs)');
      } else {
        router.push('/(auth)/verify');
      }
    }, 4000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-left" size={20} color="#000" />
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Confirm your information</Text>
        <TouchableOpacity style={styles.profileImageContainer}>

        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your Name"
          placeholderTextColor="#ccc" 
        />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your Email"
          placeholderTextColor="#ccc" 
          keyboardType="email-address"
          editable={source !== 'google'}
        />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Enter your Phone Number"
          placeholderTextColor="#ccc"
          editable={source === 'google'}
          autoFocus
        />
        <Button
          mode="contained"
          style={styles.button}
          onPress={handleNext}
          disabled={loading || (source === 'google' && !phone)}
          contentStyle={styles.buttonContent}
        >
          {loading ? <ActivityIndicator color="#000" /> : 'Next'}
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
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#ccc',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  button: {
    width: '100%',
    backgroundColor: '#00809D',
    borderRadius: 12,
  },
  buttonContent: {
    height: 48,
  },
  keyboardPlaceholder: {
    height: 200,
  },
});

export default SetupScreen;