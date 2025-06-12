import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const RideHistoryScreen = () => {
  const router = useRouter();
  const rideHistory = [
    { date: '27 Jul, 12:30 pm', from: 'Gwarko Karmanasa Marg', to: 'Kritishree Girls Hostel', fare: 'Rs142.00', status: 'completed' },
    { date: '4 Jun, 05:38 pm', from: 'Bafal Marg', to: 'Kitwosd IT Support Center', fare: 'Rs75.00', status: 'completed' },
    { date: '4 Jun, 03:58 pm', from: 'Manbhawan Bus Stop', to: 'ANFA Ground', fare: 'Rs75.00', status: 'completed' },
    { date: '2 Jun, 08:27 am', from: 'Gwarko Karmanasa Marg', to: 'Mahabir Palace Kathmandu', fare: 'Rs150.00', status: 'completed' },
    { date: '2 Jun, 08:24 am', from: 'Bafal Marg', to: 'Mahabir Palace Kathmandu', fare: 'Rs0.00', status: 'cancelled' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My rides</Text>
      </View>
      <View style={styles.rideList}>
        {rideHistory.map((ride, index) => (
          <View key={index} style={styles.rideItem}>
            <View style={styles.rideDetails}>
              <Text style={styles.rideDate}>{ride.date}</Text>
              <View style={styles.locationRow}>
                <Icon name="location-on" size={16} color={ride.status === 'cancelled' ? '#666' : '#4CAF50'} />
                <Text style={styles.rideLocation}>{ride.from}</Text>
              </View>
              <View style={styles.locationRow}>
                <Icon name="location-on" size={16} color={ride.status === 'cancelled' ? '#666' : '#2196F3'} />
                <Text style={styles.rideLocation}>{ride.to}</Text>
              </View>
              {ride.status === 'cancelled' && (
                <Text style={styles.cancelledText}>Driver cancelled</Text>
              )}
            </View>
            <View style={styles.rideFare}>
              <Text style={styles.fareText}>{ride.fare}</Text>
              <TouchableOpacity>
                <Icon name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom:20
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
  },
  rideList: {
    paddingHorizontal: 16,
  },
  rideItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',

  },
  rideDetails: {
    flex: 1,
  },
  rideDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rideLocation: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  cancelledText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  rideFare: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fareText: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
});

export default RideHistoryScreen;