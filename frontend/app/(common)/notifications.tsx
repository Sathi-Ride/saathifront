import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import websocketService from '../utils/websocketService';

const Notifications = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleBackPress = () => {
    router.back();
  };

  useEffect(() => {
    let isMounted = true;
    let rideCompletedListener: any;
    async function setupWebSocket() {
      try {
        await websocketService.connect();
        rideCompletedListener = (data: any) => {
          if (isMounted) setNotifications(prev => [{ type: 'rideCompleted', ...data, createdAt: new Date() }, ...prev]);
        };
        websocketService.on('rideCompleted', rideCompletedListener);
      } catch (err) {}
    }
    setupWebSocket();
    return () => {
      isMounted = false;
      if (rideCompletedListener) websocketService.off('rideCompleted', rideCompletedListener);
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerTitle} onPress={handleBackPress}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <View style={styles.content}>
        {notifications.length === 0 ? (
          <>
            <Icon name="notifications" size={80} color="#333" style={styles.icon} />
            <Text style={styles.title}>You are all up to date</Text>
            <Text style={styles.subtitle}>No new notifications</Text>
          </>
        ) : (
          notifications.map((notif, idx) => (
            <View key={idx} style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', color: '#075B5E' }}>{notif.type === 'rideCompleted' ? 'Ride Completed' : notif.type}</Text>
              <Text>{notif.message || 'Your ride has been completed successfully.'}</Text>
              <Text style={{ fontSize: 12, color: '#999' }}>{notif.createdAt?.toLocaleString?.() || ''}</Text>
            </View>
          ))
        )}
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
    marginTop: 25,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginLeft: 16,
    marginTop: 25,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default Notifications;