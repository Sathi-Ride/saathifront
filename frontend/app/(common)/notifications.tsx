import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import websocketService from '../utils/websocketService';
import apiClient from '../utils/apiClient';
import Toast from '../../components/ui/Toast';

const Notifications = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const showToast = (message: string, type: 'info' | 'success' | 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  const handleBackPress = () => {
    router.back();
  };

  useEffect(() => {
    let isMounted = true;
    let rideCompletedListener: any;
    async function setupWebSocket() {
      try {
        // Fetch user profile to check for driver profile
        const response = await apiClient.get('me');
        const userData = response.data.data;
        const hasDriverProfile = !!userData?.driverProfile;
        if (hasDriverProfile) {
          await websocketService.connect(undefined, 'driver');
        } else {
          await websocketService.connect(undefined, 'passenger');
        }
        rideCompletedListener = (data: any) => {
          if (isMounted) setNotifications(prev => [{ type: 'rideCompleted', ...data, createdAt: new Date() }, ...prev]);
        };
        websocketService.on('rideCompleted', rideCompletedListener);
        websocketService.on('error', (err) => {
          showToast('WebSocket error: ' + (err?.message || 'Unknown error'), 'error');
        });
      } catch (err) {
        showToast('WebSocket connection failed', 'error');
      }
    }
    setupWebSocket();
    return () => {
      isMounted = false;
      if (rideCompletedListener) websocketService.off('rideCompleted', rideCompletedListener);
      websocketService.off('error');
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={{
          backgroundColor: '#075B5E',
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
          marginTop: 27,
        }}>
          <Icon name="arrow-back" size={24} color="#fff" />
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
      {toast.visible && (
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      )}
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
    marginLeft: 18,
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