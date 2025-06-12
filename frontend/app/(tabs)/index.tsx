import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native';
import { WebView } from 'react-native-webview';
import { TextInput, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const { rideInProgress, driverName, from, to, fare, vehicle, progress: initialProgress } = useLocalSearchParams();
  const getString = (val: string | string[] | undefined) =>
    Array.isArray(val) ? val[0] ?? '' : val ?? '';
  const [localFrom, setFrom] = useState<string>(getString(from));
  const [localTo, setTo] = useState<string>(getString(to));
  const [localFare, setFare] = useState<string>(getString(fare));
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicle || 'Moto');
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;
  const router = useRouter();
  const [localRideInProgress, setLocalRideInProgress] = useState(rideInProgress === 'true');
  const [progress, setProgress] = useState(parseInt(initialProgress as string) || 0);
  const [localDriverName, setLocalDriverName] = useState(driverName || '');

  useEffect(() => {
    let timer: number;
    if (localRideInProgress && progress < 100) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              router.push({
                pathname: '/rideRate',
                params: { driverName: localDriverName, from: localFrom, to: localTo, fare: localFare, vehicle: selectedVehicle },
              });
            }, 1000);
            return 100;
          }
          return prev + 5;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [localRideInProgress, progress, localDriverName, localFrom, localTo, localFare, selectedVehicle, router]);

  useEffect(() => {
    if (rideInProgress === 'true' && driverName) {
      setFrom(getString(from));
      setTo(getString(to));
      setFare(getString(fare));
      setTo(getString(to));
      setFare(getString(fare));
      setSelectedVehicle(vehicle || 'Moto');
      setProgress(parseInt(initialProgress as string) || 0);
    }
  }, [rideInProgress, driverName, from, to, fare, vehicle, initialProgress]);

  const handleFindDriver = () => {
    console.log('Handle Find Driver called', { localFrom, localTo, localFare });
    if (!localFrom || !localTo) {
      alert('Please enter From and To locations');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const distance = Math.sqrt(
        Math.pow(27.7172 - 27.7089, 2) + Math.pow(85.3240 - 85.3206, 2)
      ) * 100;
      const baseFare = distance * (selectedVehicle === 'Moto' ? 2 : 5);
      const adjustedFare = baseFare * (1 + (Math.random() * 0.1 - 0.05));
      console.log('Navigating to driver-selection with', { localFrom, localTo, fare: adjustedFare.toFixed(2), vehicle: selectedVehicle });
      router.push({
        pathname: '/driverSelect',
        params: { from: localFrom, to: localTo, fare: adjustedFare.toFixed(2), vehicle: selectedVehicle },
      });
    }, 2000);
  };

  const selectVehicle = (vehicle: React.SetStateAction<string | string[]>) => {
    setSelectedVehicle(vehicle);
  };

  const demoLocation = {
    latitude: 27.7172,
    longitude: 85.3240,
    zoom: 13,
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ride Map</title>
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
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${demoLocation.latitude}, ${demoLocation.longitude}], ${demoLocation.zoom});
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);
          var pickupIcon = L.divIcon({
            html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            className: 'custom-marker'
          });
          L.marker([${demoLocation.latitude}, ${demoLocation.longitude}], {icon: pickupIcon}).addTo(map);
          L.marker([27.7089, 85.3206]).addTo(map).bindPopup('Buddha Chowk');
          L.marker([27.7156, 85.3145]).addTo(map).bindPopup('Gachhiya');
        </script>
      </body>
    </html>
  `;

  const vehicleOptions = [
    { id: 'Moto', name: 'Moto', icon: 'motorcycle', passengers: 1, color: '#4CAF50' },
    { id: 'Ride', name: 'Ride', icon: 'directions-car', passengers: 4, color: '#2196F3' },
  ];

  const openSidePanel = () => {
    setSidePanelVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSidePanel = () => {
    Animated.timing(slideAnim, {
      toValue: -width * 0.75,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setSidePanelVisible(false));
  };

  const handleLogout = () => {
    router.push('/login');
    closeSidePanel();
  };

  const handleChangeToDriver = () => {
    console.log('Change to Driver clicked');
    closeSidePanel();
  };

  const navigateToProfile = () => {
    router.push('/profile');
    closeSidePanel();
  };

  const navigateToTripHistory = () => {
    router.push('/rideHistory');
    closeSidePanel();
  };

  const openRideTracking = () => {
    router.push({
      pathname: '/rideTracker',
      params: { driverName: localDriverName, from: localFrom, to: localTo, fare: localFare, vehicle: selectedVehicle, rideInProgress: localRideInProgress.toString(), progress: progress.toString() },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.mapContainer}>
        {!sidePanelVisible && (
          <TouchableOpacity 
            style={styles.hamburgerButton} 
            onPress={openSidePanel}
          >
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
        )}

        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.vehicleContainer}>
          {vehicleOptions.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleOption,
                selectedVehicle === vehicle.id && styles.selectedVehicle
              ]}
              onPress={() => selectVehicle(vehicle.id)}
            >
              <View style={styles.vehicleIconContainer}>
                <Icon 
                  name={vehicle.icon} 
                  size={24} 
                  color={selectedVehicle === vehicle.id ? vehicle.color : '#666'} 
                />
                <View style={styles.passengerBadge}>
                  <Icon name="person" size={12} color="#666" />
                  <Text style={styles.passengerCount}>{vehicle.passengers}</Text>
                </View>
              </View>
              <Text style={[
                styles.vehicleName,
                selectedVehicle === vehicle.id && { color: vehicle.color, fontWeight: '600' }
              ]}>
                {vehicle.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <Icon name="search" size={20} color="#075B5E" style={styles.searchIcon} />
            <TextInput
              mode="flat"
              value={localFrom}
              onChangeText={setFrom}
              placeholder="From (Pickup Location)"
              placeholderTextColor={'#ccc'}
              style={styles.locationInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
              autoFocus
            />
          </View>

          <View style={styles.inputRow}>
            <Icon name="search" size={20} color="#EA2F14" style={styles.searchIcon} />
            <TextInput
              mode="flat"
              placeholder="To (Destination)"
              placeholderTextColor={'#ccc'}
              value={localTo}
              onChangeText={setTo}
              style={styles.locationInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              mode="flat"
              placeholder="Offer your fare"
              placeholderTextColor={'#ccc'}
              value={localFare}
              onChangeText={setFare}
              style={styles.fareInput}
              keyboardType="numeric"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              contentStyle={styles.inputContent}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.findDriverButton, loading && styles.buttonDisabled]}
          onPress={handleFindDriver}
          disabled={loading}
        >
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.buttonText}>Find a driver</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {localRideInProgress && (
        <View style={[styles.miniPlayer, { top: height * 0.3, bottom: 'auto' }]}>
          <Text style={styles.miniPlayerText}>Ride with {localDriverName} - {progress}%</Text>
          <TouchableOpacity style={styles.miniPlayerButton} onPress={openRideTracking}>
            <Icon name="play-arrow" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {sidePanelVisible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground} 
            onPress={closeSidePanel}
          />
          <Animated.View style={[styles.sidePanel, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.sidePanelHeader}>
              <Text style={styles.sidePanelTitle}>Menu</Text>
              <TouchableOpacity onPress={closeSidePanel}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem} onPress={closeSidePanel}>
                <Icon name="home" size={24} color="#333" />
                <Text style={styles.menuText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={navigateToTripHistory}>
                <Icon name="directions-car" size={24} color="#333" />
                <Text style={styles.menuText}>Trip History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={navigateToProfile}>
                <Icon name="person-4" size={24} color="#333" />
                <Text style={styles.menuText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={closeSidePanel}>
                <Icon name="contact-support" size={24} color="#333" />
                <Text style={styles.menuText}>Support</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bottomButtons}>
              <TouchableOpacity style={styles.changeToDriverButton} onPress={handleChangeToDriver}>
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Change to Driver</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Icon name="logout" size={24} color="#f44336" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  hamburgerButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    flex: 1,
    width: width,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  vehicleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  vehicleOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  selectedVehicle: {
    backgroundColor: '#f0f9ff',
  },
  vehicleIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  passengerBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  passengerCount: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  vehicleName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  searchIcon: {
    marginRight: 16,
  },
  rupeeSymbol: {
    fontSize: 18,
    color: '#333',
    marginRight: 16,
    fontWeight: '500',
  },
  locationInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  fareInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  inputContent: {
    paddingHorizontal: 0,
  },
  findDriverButton: {
    backgroundColor: '#075B5E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  sidePanel: {
    width: width * 0.75,
    backgroundColor: '#fff',
    height: '100%',
    paddingTop: 50,
  },
  sidePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidePanelTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  menuItems: {
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bottomButtons: {
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  changeToDriverButton: {
    backgroundColor: '#075B5E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 420,
    width: width * 0.65,
    marginLeft: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoutText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  miniPlayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#075B5E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  miniPlayerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  miniPlayerButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
  },
});

export default HomeScreen;