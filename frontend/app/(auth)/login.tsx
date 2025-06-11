import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';

const LoginScreen = () => {
  const [phone, setPhone] = React.useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your app for fair deals</Text>
      <Text style={styles.subtitle}>Choose rides that are right for you</Text>
      <TextInput
        label="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <Button mode="contained" style={styles.button} onPress={() => console.log('Login pressed')}>
        Continue with phone
      </Button>
      <TouchableOpacity style={styles.altButton}>
        <Text>Continue with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.altButton}>
        <Text>Continue with Passkey</Text>
      </TouchableOpacity>
      <Text style={styles.terms}>Joining our app means you agree with our Terms of Use and Privacy Policy</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    width: '80%',
    marginBottom: 16,
  },
  button: {
    width: '80%',
    backgroundColor: '#00ff00',
    marginBottom: 8,
  },
  altButton: {
    width: '80%',
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
    borderRadius: 8,
  },
  terms: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default LoginScreen;