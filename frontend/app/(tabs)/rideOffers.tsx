import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from '../../components/ui/Toast';
import { rideService, RideOffer } from '../utils/rideService';

const { width, height } = Dimensions.get('window');

const RideOffersScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const rideId = params.rideId as string;
  const from = params.from as string;
  const to = params.to as string;
  const fare = params.fare as string;
  const vehicle = params.vehicle as string;

  const [offers, setOffers] = useState<RideOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<RideOffer | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    loadOffers();
  }, [rideId]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      console.log('RideOffers: Loading offers for rideId:', rideId);
      const rideOffers = await rideService.getRideOffers(rideId);
      console.log('RideOffers: Received offers:', rideOffers);
      setOffers(rideOffers);
    } catch (error) {
      console.error('RideOffers: Error loading offers:', error);
      showToast('Error loading offers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOffers();
    setRefreshing(false);
  };

  const handleAcceptOffer = async (offer: RideOffer) => {
    setSelectedOffer(offer);
    setProcessing(true);
    showToast('Accepting offer...', 'info');

    try {
      console.log('RideOffers: Accepting offer:', {
        rideId,
        offerId: offer._id,
        offer: offer
      });
      
      const success = await rideService.acceptRideOffer(rideId, offer._id);
      console.log('RideOffers: Accept offer result:', success);
      
      if (success) {
        showToast('Offer accepted! Driver is on the way', 'success');
        setTimeout(() => {
          router.push({
            pathname: '/rideTracker',
            params: {
              rideId,
              driverName: `${offer.driver.firstName} ${offer.driver.lastName}`,
              from,
              to,
              fare: offer.offeredPrice.toString(),
              vehicle,
              rideInProgress: 'true',
              progress: '0',
            },
          });
        }, 1500);
      } else {
        showToast('Failed to accept offer', 'error');
      }
    } catch (error) {
      console.error('RideOffers: Error accepting offer:', error);
      showToast('Error accepting offer', 'error');
    } finally {
      setProcessing(false);
      setSelectedOffer(null);
    }
  };

  const handleRejectOffer = async (offer: RideOffer) => {
    setProcessing(true);
    showToast('Rejecting offer...', 'info');

    try {
      console.log('RideOffers: Rejecting offer:', {
        rideId,
        offerId: offer._id,
        offer: offer
      });
      
      const success = await rideService.rejectRideOffer(rideId, offer._id);
      console.log('RideOffers: Reject offer result:', success);
      
      if (success) {
        showToast('Offer rejected', 'info');
        // Remove the rejected offer from the list
        setOffers(prev => prev.filter(o => o._id !== offer._id));
      } else {
        showToast('Failed to reject offer', 'error');
      }
    } catch (error) {
      console.error('RideOffers: Error rejecting offer:', error);
      showToast('Error rejecting offer', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const renderOffer = ({ item }: { item: RideOffer }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <MaterialIcons name="person" size={24} color="#075B5E" />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>
              {item.driver.firstName} {item.driver.lastName}
            </Text>
            <View style={styles.ratingContainer}>
              <MaterialIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{item.driver.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.vehicleInfo}>
              {item.driver.vehicleDetails.vehicleModel} • {item.driver.vehicleDetails.vehicleRegNum}
            </Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{item.offeredPrice}</Text>
          <Text style={styles.priceLabel}>Offered Price</Text>
        </View>
      </View>

      {item.message && (
        <View style={styles.messageContainer}>
          <MaterialIcons name="chat" size={16} color="#666" />
          <Text style={styles.message}>{item.message}</Text>
        </View>
      )}

      <View style={styles.offerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectOffer(item)}
          disabled={processing}
        >
          <MaterialIcons name="close" size={20} color="#EA2F14" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptOffer(item)}
          disabled={processing}
        >
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="local-taxi" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No offers yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        We're searching for drivers in your area. This may take a few moments.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <MaterialIcons name="refresh" size={20} color="#075B5E" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Offers</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.rideInfo}>
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color="#075B5E" />
            <Text style={styles.locationText} numberOfLines={1}>{from}</Text>
          </View>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color="#EA2F14" />
            <Text style={styles.locationText} numberOfLines={1}>{to}</Text>
          </View>
        </View>
        <View style={styles.rideDetails}>
          <Text style={styles.vehicleType}>{vehicle}</Text>
          <Text style={styles.yourOffer}>Your offer: ₹{fare}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#075B5E" />
          <Text style={styles.loadingText}>Searching for drivers...</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.offersList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  rideInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  routeInfo: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleType: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  yourOffer: {
    fontSize: 14,
    color: '#075B5E',
    fontWeight: '600',
  },
  offersList: {
    padding: 16,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#999',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#075B5E',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderColor: '#EA2F14',
  },
  rejectButtonText: {
    color: '#EA2F14',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#075B5E',
    borderColor: '#075B5E',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#075B5E',
  },
  refreshButtonText: {
    color: '#075B5E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RideOffersScreen; 