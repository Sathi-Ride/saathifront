// "use client";

// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   StatusBar,
//   Dimensions,
//   Animated,
//   Alert,
//   Linking,
// } from 'react-native';
// import * as Location from 'expo-location';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { MaterialIcons } from '@expo/vector-icons';
// import Toast from '../../components/ui/Toast';
// import { rideService } from '../utils/rideService';
// import { locationService } from '../utils/locationService';
// import webSocketService from '../utils/websocketService';
// import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
// import { getAccessToken } from '../utils/apiClient';
// import debounce from 'lodash/debounce';

// const { width, height } = Dimensions.get('window');

// async function getAuthToken() {
//   return await getAccessToken();
// }

// const RideTrackerScreen = () => {
//   const params = useLocalSearchParams();
//   const router = useRouter();

//   const rideId = params.rideId as string;
//   const driverName = params.driverName as string;
//   const from = params.from as string;
//   const to = params.to as string;
//   const fare = params.fare as string;
//   const vehicle = params.vehicle as string;
//   const rideInProgress = params.rideInProgress === 'true';
//   const initialProgress = Number(params.progress) || 0;

//   const [progress, setProgress] = useState(initialProgress);
//   const [rideStatus, setRideStatus] = useState<'accepted' | 'in-progress' | 'completed'>(rideInProgress ? 'in-progress' : 'accepted');
//   const [isRideInProgress, setIsRideInProgress] = useState(rideInProgress);
//   const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
//   const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
//   const [estimatedArrival, setEstimatedArrival] = useState<string>('');
//   const [rideDetails, setRideDetails] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [toast, setToast] = useState<{
//     visible: boolean;
//     message: string;
//     type: 'success' | 'error' | 'info';
//   }>({
//     visible: false,
//     message: '',
//     type: 'info',
//   });
//   const [driverLocationHistory, setDriverLocationHistory] = useState<{ lat: number; lng: number }[]>([]);
//   const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
//   const lastProgressTimestamp = useRef(0);

//   const progressAnimation = useRef(new Animated.Value(initialProgress)).current;
//   const pulseAnimation = useRef(new Animated.Value(1)).current;

//   const showToast = (message: string, type: 'success' | 'error' | 'info') => {
//     setToast({ visible: true, message, type });
//   };

//   const hideToast = () => {
//     setToast(prev => ({ ...prev, visible: false }));
//   };

//   const ensureSocketConnected = async (rideId: string | undefined, namespace: 'passenger' | 'ride') => {
//     try {
//       if (!webSocketService.isSocketConnected(namespace)) {
//         await webSocketService.connect(rideId, namespace);
//         await new Promise<void>((resolve, reject) => {
//           const socket = webSocketService.getSocket(namespace);
//           if (socket && socket.connected) return resolve();
//           socket?.once('connect', () => resolve());
//           socket?.once('connect_error', (error: Error) => reject(new Error(`Connection error: ${error.message}`)));
//           setTimeout(() => reject(new Error('Timeout waiting for socket connection')), 10000);
//         });
//       }
//     } catch (error) {
//       let errorMsg = '';
//       if (error instanceof Error) {
//         errorMsg = error.message;
//       } else if (typeof error === 'string') {
//         errorMsg = error;
//       } else {
//         errorMsg = JSON.stringify(error);
//       }
//       throw new Error(`WebSocket connection failed for ${namespace} namespace: ${errorMsg}`);
//     }
//   };

//   const emitWhenConnected = async (event: string, data: any, namespace: 'passenger' | 'ride', timeoutMs: number = 15000) => {
//     let attempt = 0;
//     const maxRetries = 3;
//     while (attempt < maxRetries) {
//       try {
//         await ensureSocketConnected(rideId, namespace);
//         return await new Promise((resolve, reject) => {
//           webSocketService.emitEvent(event, data, (response: any) => {
//             if (response?.code === 200 || response?.code === 201) {
//               resolve(response.data);
//             } else {
//               reject(new Error(response?.message || 'Failed to emit event'));
//             }
//           }, namespace);
//           setTimeout(() => reject(new Error(`Timeout emitting ${event} to ${namespace} namespace`)), timeoutMs);
//         });
//       } catch (error) {
//         attempt++;
//         if (attempt >= maxRetries) throw error;
//         await new Promise(res => setTimeout(res, 500));
//       }
//     }
//   };

//   // Debounced handler for ride progress updates
//   const handleRideProgressUpdate = useCallback(
//     debounce((data: any) => {
//       console.log('RECEIVED rideProgressUpdate:', data);
//       if (!data) {
//         console.warn('rideProgressUpdate handler called with no data');
//         return;
//       }
//       if (data.rideId !== rideId) {
//         console.warn('rideProgressUpdate for wrong rideId:', data.rideId, 'expected:', rideId);
//         return;
//       }
//       if (!data.timestamp) {
//         console.warn('Missing timestamp in ride progress update:', data);
//         return;
//       }
//       if (data.timestamp <= lastProgressTimestamp.current) {
//         console.log('Ignoring outdated or duplicate progress update:', data);
//         return;
//       }
//       console.log('Processing progress update:', data);
//       setProgress(data.progress);
//       Animated.timing(progressAnimation, {
//         toValue: data.progress,
//         duration: 500,
//         useNativeDriver: false,
//       }).start();
//       if (data.currentLocation) {
//         setDriverLocation(data.currentLocation);
//         setDriverLocationHistory(prev => [...prev.slice(-50), data.currentLocation]);
//       }
//       lastProgressTimestamp.current = data.timestamp;
//     }, 500),
//     [rideId, progressAnimation]
//   );

//   useEffect(() => {
//     let isMounted = true;

//     const setupWebSocket = async () => {
//       try {
//         await Promise.all([
//           ensureSocketConnected(undefined, 'passenger'),
//           ensureSocketConnected(rideId, 'ride'),
//         ]);

//         const details = await emitWhenConnected('getRideDetails', { rideId }, 'ride');
//         if (isMounted) {
//           setRideDetails(details);
//           const d: any = details;
//           if (d && d.pickUp && d.pickUp.coords && Array.isArray(d.pickUp.coords.coordinates)) {
//             setPickupLocation({
//               lat: d.pickUp.coords.coordinates[1],
//               lng: d.pickUp.coords.coordinates[0],
//             });
//           }
//           if (d && d.status === 'ongoing') {
//             setRideStatus('in-progress');
//             setIsRideInProgress(true);
//           } else if (d && d.status === 'completed') {
//             setRideStatus('completed');
//           }
//         }

//         webSocketService.on('rideStatusUpdate', (data: any) => {
//           if (!isMounted) return;
//           console.log('RideTracker: Ride status update received:', data);
//           if (data && data.status) {
//             setRideStatus(data.status === 'ongoing' ? 'in-progress' : data.status);
//             if (data.status === 'ongoing') {
//               setIsRideInProgress(true);
//             }
//           }
//         }, 'ride');

//         webSocketService.on('rideCompleted', (data: any) => {
//           if (!isMounted) return;
//           console.log('RideTracker: Ride completed event received:', data);
//           setRideStatus('completed');
//           showToast('Ride completed! Please rate your driver', 'success');
//           setTimeout(() => {
//             if (isMounted) {
//               router.push({
//                 pathname: '/(tabs)/rideRate',
//                 params: { rideId, driverName, from, to, fare, vehicle },
//               });
//             }
//           }, 2000);
//         }, 'ride');

//         webSocketService.on('rideStarted', (data: any) => {
//           if (!isMounted) return;
//           console.log('RideTracker: Ride started event received:', data);
//           setRideStatus('in-progress');
//           setIsRideInProgress(true);
//           showToast('Ride started!', 'success');
//         }, 'ride');

//         // Register ride progress event handler ONCE per rideId
//         webSocketService.on('rideProgressUpdate', handleRideProgressUpdate, 'ride');
//       } catch (error) {
//         console.error('RideTracker: WebSocket setup failed:', error);
//         if (isMounted) showToast('Failed to connect to ride service', 'error');
//       }
//     };

//     const initializeTracker = async () => {
//       try {
//         const location = await locationService.getCurrentLocation();
//         if (isMounted) {
//           setCurrentLocation({ lat: location.latitude, lng: location.longitude });
//         }

//         await locationService.startLocationTracking(async (newLocation) => {
//           const locationData = { lat: newLocation.latitude, lng: newLocation.longitude };
//           if (isMounted) {
//             setCurrentLocation(locationData);
//           }
//           try {
//             await emitWhenConnected('updatePassengerLocation', {
//               rideId,
//               latitude: newLocation.latitude,
//               longitude: newLocation.longitude,
//             }, 'passenger');
//             console.log('RideTracker: Passenger location updated:', locationData);
//           } catch (error) {
//             console.error('Error sending passenger location update:', error);
//           }
//         }, {
//           accuracy: Location.Accuracy.High,
//           timeInterval: 5000,
//           distanceInterval: 10,
//         });
//       } catch (error) {
//         console.error('Error initializing tracker:', error);
//         if (isMounted) showToast('Error initializing tracker', 'error');
//       }
//     };

//     const startPulseAnimation = () => {
//       Animated.loop(
//         Animated.sequence([
//           Animated.timing(pulseAnimation, {
//             toValue: 1.2,
//             duration: 1000,
//             useNativeDriver: true,
//           }),
//           Animated.timing(pulseAnimation, {
//             toValue: 1,
//             duration: 1000,
//             useNativeDriver: true,
//           }),
//         ])
//       ).start();
//     };

//     setupWebSocket();
//     initializeTracker();
//     startPulseAnimation();

//     return () => {
//       isMounted = false;
//       locationService.stopLocationTracking();
//       webSocketService.disconnect('passenger');
//       webSocketService.disconnect('ride');
//       webSocketService.off('rideStatusUpdate', undefined, 'ride');
//       webSocketService.off('rideCompleted', undefined, 'ride');
//       webSocketService.off('rideStarted', undefined, 'ride');
//       // Unregister ride progress event handler
//       webSocketService.off('rideProgressUpdate', handleRideProgressUpdate, 'ride');
//     };
//   }, [rideId, handleRideProgressUpdate]);

//   const handleCallDriver = async () => {
//     try {
//       const driverPhone = rideDetails?.driver?.mobile || '9815364055';
//       const phoneNumber = `tel:${driverPhone}`;
//       const canOpen = await Linking.canOpenURL(phoneNumber);
//       if (canOpen) {
//         await Linking.openURL(phoneNumber);
//         console.log('Opened phone app with number:', driverPhone);
//       } else {
//         showToast('Cannot open phone app on this device', 'error');
//       }
//     } catch (error) {
//       console.error('Error opening phone app:', error);
//       showToast('Error opening phone app', 'error');
//     }
//   };

//   const handleMessageDriver = () => {
//     router.push({
//       pathname: '/(common)/messaging',
//       params: {
//         rideId,
//         driverName,
//         driverPhone: rideDetails?.driver?.mobile || '9815364055',
//         passengerName: 'You',
//         passengerPhone: '9801020304',
//         userRole: 'passenger',
//       },
//     });
//   };

//   const handleCancelRide = () => {
//     Alert.alert(
//       'Cancel Ride',
//       'Are you sure you want to cancel this ride?',
//       [
//         { text: 'No', style: 'cancel' },
//         {
//           text: 'Yes',
//           style: 'destructive',
//           onPress: async () => {
//             setLoading(true);
//             try {
//               const success = await rideService.cancelRide(rideId);
//               if (success) {
//                 showToast('Ride cancelled successfully', 'info');
//                 setTimeout(() => {
//                   router.push('/(tabs)');
//                 }, 1500);
//               } else {
//                 showToast('Failed to cancel ride', 'error');
//               }
//             } catch (error) {
//               console.error('Error cancelling ride:', error);
//               showToast('Error cancelling ride', 'error');
//             } finally {
//               setLoading(false);
//             }
//           },
//         },
//       ]
//     );
//   };

//   const getStatusText = () => {
//     switch (rideStatus) {
//       case 'accepted':
//         return 'Driver is on the way';
//       case 'in-progress':
//         return 'Ride in progress';
//       case 'completed':
//         return 'Ride completed';
//       default:
//         return 'Ride accepted';
//     }
//   };

//   const getStatusColor = () => {
//     switch (rideStatus) {
//       case 'accepted':
//         return '#FF9800';
//       case 'in-progress':
//         return '#4CAF50';
//       case 'completed':
//         return '#2196F3';
//       default:
//         return '#FF9800';
//     }
//   };

//   const dropoffLocation = rideDetails?.dropOff?.coords?.coordinates
//     ? { lat: rideDetails.dropOff.coords.coordinates[1], lng: rideDetails.dropOff.coords.coordinates[0] }
//     : null;

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#075B5E" />
//       <View style={styles.mapContainer}>
//         <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
//           <MaterialIcons name="arrow-back" size={24} color="#fff" />
//         </TouchableOpacity>
//         <MapView
//           style={styles.map}
//           provider={PROVIDER_GOOGLE}
//           initialRegion={{
//             latitude: pickupLocation?.lat || currentLocation?.lat || 26.6587,
//             longitude: pickupLocation?.lng || currentLocation?.lng || 87.3255,
//             latitudeDelta: 0.015,
//             longitudeDelta: 0.0121,
//           }}
//         >
//           {driverLocation && (
//             <Marker
//               coordinate={{
//                 latitude: driverLocation.lat,
//                 longitude: driverLocation.lng,
//               }}
//               title="Driver"
//               description="Coming to pick you up"
//             >
//               <View style={styles.driverMarker}>
//                 <MaterialIcons name="directions-car" size={20} color="#FF9800" />
//               </View>
//             </Marker>
//           )}
//           {pickupLocation && (
//             <Marker
//               coordinate={{
//                 latitude: pickupLocation.lat,
//                 longitude: pickupLocation.lng,
//               }}
//               title="Pickup Location"
//               description="Waiting at pickup location"
//             >
//               <View style={styles.passengerMarker}>
//                 <MaterialIcons name="location-on" size={20} color="#4CAF50" />
//               </View>
//             </Marker>
//           )}
//           {dropoffLocation && (
//             <Marker
//               coordinate={{
//                 latitude: dropoffLocation.lat,
//                 longitude: dropoffLocation.lng,
//               }}
//               title="Dropoff"
//               description="Destination"
//             >
//               <View style={styles.dropoffMarker}>
//                 <MaterialIcons name="location-on" size={20} color="#EA2F14" />
//               </View>
//             </Marker>
//           )}
//           {driverLocation && pickupLocation && rideStatus === 'accepted' && (
//             <Polyline
//               coordinates={[
//                 { latitude: driverLocation.lat, longitude: driverLocation.lng },
//                 { latitude: pickupLocation.lat, longitude: pickupLocation.lng },
//               ]}
//               strokeColor="#2196F3"
//               strokeWidth={4}
//               lineDashPattern={[5, 5]}
//             />
//           )}
//           {pickupLocation && dropoffLocation && rideStatus === 'in-progress' && (
//             <Polyline
//               coordinates={[
//                 { latitude: pickupLocation.lat, longitude: pickupLocation.lng },
//                 { latitude: dropoffLocation.lat, longitude: dropoffLocation.lng },
//               ]}
//               strokeColor="#075B5E"
//               strokeWidth={4}
//               lineDashPattern={[5, 5]}
//             />
//           )}
//           {driverLocationHistory.length > 1 && (
//             <Polyline
//               coordinates={driverLocationHistory.map(loc => ({
//                 latitude: loc.lat,
//                 longitude: loc.lng,
//               }))}
//               strokeColor="#FF9800"
//               strokeWidth={3}
//             />
//           )}
//         </MapView>
//       </View>
//       <View style={styles.bottomSheet}>
//         <View style={styles.progressContainer}>
//           <View style={styles.progressHeader}>
//             <Text style={styles.progressTitle}>Ride Progress</Text>
//             <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
//           </View>
//           <View style={styles.progressBar}>
//             <Animated.View
//               style={[
//                 styles.progressFill,
//                 {
//                   width: progressAnimation.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
//                   backgroundColor: getStatusColor(),
//                 },
//               ]}
//             />
//           </View>
//           <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
//         </View>
//         <View style={styles.rideInfo}>
//           <View style={styles.routeInfo}>
//             <View style={styles.locationRow}>
//               <MaterialIcons name="location-on" size={16} color="#075B5E" />
//               <Text style={styles.locationText} numberOfLines={1}>{from}</Text>
//             </View>
//             <View style={styles.locationRow}>
//               <MaterialIcons name="location-on" size={16} color="#EA2F14" />
//               <Text style={styles.locationText} numberOfLines={1}>{to}</Text>
//             </View>
//           </View>
//           <View style={styles.rideDetails}>
//             <Text style={styles.vehicleType}>{vehicle}</Text>
//             <Text style={styles.fare}>₹{fare}</Text>
//           </View>
//         </View>
//         <View style={styles.driverInfo}>
//           <Animated.View style={[styles.driverAvatar, { transform: [{ scale: pulseAnimation }] }]}>
//             <MaterialIcons name="person" size={24} color="#075B5E" />
//           </Animated.View>
//           <View style={styles.driverDetails}>
//             <Text style={styles.driverName}>{driverName}</Text>
//             <Text style={styles.driverStatus}>Your driver</Text>
//           </View>
//           <View style={styles.driverActions}>
//             <TouchableOpacity style={styles.actionButton} onPress={handleCallDriver}>
//               <MaterialIcons name="phone" size={20} color="#075B5E" />
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.actionButton} onPress={handleMessageDriver}>
//               <MaterialIcons name="message" size={20} color="#075B5E" />
//             </TouchableOpacity>
//           </View>
//         </View>
//         {estimatedArrival && (
//           <View style={styles.etaContainer}>
//             <MaterialIcons name="access-time" size={16} color="#666" />
//             <Text style={styles.etaText}>Estimated arrival: {estimatedArrival}</Text>
//           </View>
//         )}
//         <TouchableOpacity style={[styles.cancelButton, loading && styles.buttonDisabled]} onPress={handleCancelRide} disabled={loading}>
//           <MaterialIcons name="close" size={20} color="#EA2F14" />
//           <Text style={styles.cancelButtonText}>Cancel Ride</Text>
//         </TouchableOpacity>
//       </View>
//       <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f9fa',
//   },
//   mapContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   backButton: {
//     position: 'absolute',
//     top: 50,
//     left: 16,
//     zIndex: 1000,
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   map: {
//     flex: 1,
//   },
//   bottomSheet: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 10,
//   },
//   progressContainer: {
//     marginBottom: 20,
//   },
//   progressHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   progressTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//   },
//   statusText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   progressBar: {
//     height: 8,
//     backgroundColor: '#e9ecef',
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginBottom: 8,
//   },
//   progressFill: {
//     height: '100%',
//     borderRadius: 4,
//   },
//   progressText: {
//     fontSize: 12,
//     color: '#666',
//     textAlign: 'center',
//   },
//   rideInfo: {
//     marginBottom: 20,
//   },
//   routeInfo: {
//     marginBottom: 12,
//   },
//   locationRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   locationText: {
//     fontSize: 16,
//     color: '#333',
//     marginLeft: 8,
//     flex: 1,
//   },
//   rideDetails: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   vehicleType: {
//     fontSize: 14,
//     color: '#666',
//     fontWeight: '500',
//   },
//   fare: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#075B5E',
//   },
//   driverInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   driverAvatar: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#f0f8ff',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 12,
//   },
//   driverDetails: {
//     flex: 1,
//   },
//   driverName: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 2,
//   },
//   driverStatus: {
//     fontSize: 14,
//     color: '#666',
//   },
//   driverActions: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   actionButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#f8f9fa',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: '#e9ecef',
//   },
//   etaContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f8f9fa',
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 16,
//   },
//   etaText: {
//     fontSize: 14,
//     color: '#666',
//     marginLeft: 8,
//   },
//   cancelButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#EA2F14',
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   cancelButtonText: {
//     color: '#EA2F14',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   buttonDisabled: {
//     opacity: 0.6,
//   },
//   driverMarker: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   passengerMarker: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   dropoffMarker: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

// export default RideTrackerScreen;