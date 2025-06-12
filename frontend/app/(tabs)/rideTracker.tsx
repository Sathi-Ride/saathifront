import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const RideTrackingScreen = () => {
  const { driverName, from, to, fare, vehicle, rideInProgress, progress: initialProgress } = useLocalSearchParams();
  const router = useRouter();
  const [progress, setProgress] = useState(parseInt(initialProgress as string) || 0);
  const [currentCoords, setCurrentCoords] = useState([27.7172, 85.3240]); // Starting point
  const [isBackground, setIsBackground] = useState(rideInProgress === 'true');

  useEffect(() => {
    let timer: number;
    const targetCoords = [27.7089, 85.3206]; // Dummy destination
    timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            router.push({
              pathname: '/rideRate',
              params: { driverName, from, to, fare, vehicle },
            });
          }, 1000);
          return 100;
        }
        const newProgress = prev + 5;
        const latStep = (targetCoords[0] - currentCoords[0]) / 20;
        const lonStep = (targetCoords[1] - currentCoords[1]) / 20;
        setCurrentCoords([
          currentCoords[0] + latStep,
          currentCoords[1] + lonStep,
        ]);
        return newProgress;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentCoords, driverName, from, to, fare, vehicle, router]);

  const handleBackPress = () => {
    setIsBackground(true);
    router.push({
      pathname: '/(tabs)',
      params: { rideInProgress: 'true', driverName, from, to, fare, vehicle, progress: progress.toString() },
    });
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ride Tracking</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width">
        <style>
          #map { width: 100%; height: 100%; }
          html, body { margin: 0; padding: 0; height: 100%; }
          .leaflet-control-container { display: none; }
        </style>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${currentCoords[0]}, ${currentCoords[1]}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);
          var polyline = L.polyline([${currentCoords.join(', ')}], {color: 'blue'}).addTo(map);
          setInterval(() => {
            const newLat = ${currentCoords[0]} + Math.random() * 0.001;
            const newLon = ${currentCoords[1]} + Math.random() * 0.001;
            polyline.addLatLng([newLat, newLon]);
            map.panTo([newLat, newLon]);
          }, 1000);
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Tracking</Text>
      </View>
      <WebView
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.progressContainer}>
        <Text>Progress: {progress}%</Text>
        <Text>Driver: {driverName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
    marginTop: 40,
  },
  map: {
    flex: 1,
  },
  progressContainer: {
    padding: 16,
    alignItems: 'center',
  },
});

export default RideTrackingScreen;