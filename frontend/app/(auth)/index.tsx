import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';

const SplashScreen = () => {
  const router = useRouter();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logotra.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Saathi</Text>
      <Text style={styles.tagline}>Your Ride, Your Way</Text>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00809D" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
});

export default SplashScreen;