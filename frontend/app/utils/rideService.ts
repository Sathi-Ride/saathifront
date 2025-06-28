import apiClient from './apiClient';

export interface RideRequest {
  vehicleType: string;
  pickUpLocation: string;
  pickUpLat: number;
  pickUpLng: number;
  pickUpTime?: Date;
  dropOffLocation: string;
  dropOffLat: number;
  dropOffLng: number;
  offerPrice: number;
  comments?: string;
}

export interface Ride {
  _id: string;
  passenger: {
    _id: string;
    firstName: string;
    lastName: string;
    mobile: string;
  };
  driver?: {
    _id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    rating: number;
  };
  vehicleType: {
    _id: string;
    name: string;
    basePrice: number;
    pricePerKm: number;
  };
  pickUpLocation: string;
  pickUpLat: number;
  pickUpLng: number;
  pickUpTime?: Date;
  dropOffLocation: string;
  dropOffLat: number;
  dropOffLng: number;
  offerPrice: number;
  finalPrice?: number;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RideOffer {
  _id: string;
  ride: string;
  driver: {
    _id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    rating: number;
    vehicleDetails: {
      vehicleModel: string;
      vehicleRegNum: string;
    };
  };
  offeredPrice: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface VehicleType {
  _id: string;
  name: string;
  description?: string;
  basePrice: number;
  pricePerKm: number;
  isActive: boolean;
}

class RideService {
  // Get available vehicle types
  async getVehicleTypes(): Promise<VehicleType[]> {
    try {
      const response = await apiClient.get('/vehicle-types');
      if (response.data.statusCode === 200) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting vehicle types:', error);
      return [];
    }
  }

  // Create a new ride request
  async createRide(rideData: RideRequest): Promise<Ride | null> {
    try {
      // Ensure coordinates are numbers
      const requestData = {
        vehicleType: rideData.vehicleType,
        pickUpLocation: rideData.pickUpLocation,
        pickUpLat: Number(rideData.pickUpLat),
        pickUpLng: Number(rideData.pickUpLng),
        dropOffLocation: rideData.dropOffLocation,
        dropOffLat: Number(rideData.dropOffLat),
        dropOffLng: Number(rideData.dropOffLng),
        offerPrice: Number(rideData.offerPrice),
        comments: rideData.comments,
        pickUpTime: rideData.pickUpTime
      };

      console.log('Creating ride with data:', requestData);

      const response = await apiClient.post('/rides', requestData);
      console.log('RideService: Create ride response:', response.data);
      
      if (response.data.statusCode === 201) {
        // Transform the response to match our Ride interface
        const ride = response.data.data;
        console.log('RideService: Created ride data:', ride);
        console.log('RideService: Ride status:', ride.status);
        
        return {
          _id: ride._id,
          passenger: {
            _id: ride.passengerId || '',
            firstName: ride.passenger?.firstName || '',
            lastName: ride.passenger?.lastName || '',
            mobile: ride.passenger?.mobile || '',
          },
          vehicleType: {
            _id: ride.vehicleType,
            name: ride.vehicle?.name || '',
            basePrice: 0,
            pricePerKm: 0,
          },
          pickUpLocation: ride.pickUpLocation || ride.pickUp?.location || '',
          pickUpLat: ride.pickUpLat || ride.pickUp?.coords?.coordinates[1] || 0,
          pickUpLng: ride.pickUpLng || ride.pickUp?.coords?.coordinates[0] || 0,
          dropOffLocation: ride.dropOffLocation || ride.dropOff?.location || '',
          dropOffLat: ride.dropOffLat || ride.dropOff?.coords?.coordinates[1] || 0,
          dropOffLng: ride.dropOffLng || ride.dropOff?.coords?.coordinates[0] || 0,
          offerPrice: ride.offerPrice,
          status: ride.status?.toLowerCase() || 'pending',
          comments: ride.comments,
          createdAt: new Date(ride.createdAt),
          updatedAt: new Date(ride.updatedAt || ride.createdAt),
        };
      }
      console.log('RideService: Ride creation failed with status:', response.data.statusCode);
      return null;
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  }

  // Get passenger rides
  async getPassengerRides(status?: string): Promise<Ride[]> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/rides/passenger', { params });
      if (response.data.statusCode === 200) {
        // Transform the backend response to match our Ride interface
        return response.data.data.map((ride: any) => ({
          _id: ride._id,
          passenger: {
            _id: ride.passengerId,
            firstName: ride.passenger?.firstName || '',
            lastName: ride.passenger?.lastName || '',
            mobile: ride.passenger?.mobile || '',
          },
          vehicleType: {
            _id: ride.vehicleType,
            name: ride.vehicle?.name || '',
            basePrice: 0,
            pricePerKm: 0,
          },
          pickUpLocation: ride.pickUp.location,
          pickUpLat: ride.pickUp.coords.coordinates[1],
          pickUpLng: ride.pickUp.coords.coordinates[0],
          dropOffLocation: ride.dropOff.location,
          dropOffLat: ride.dropOff.coords.coordinates[1],
          dropOffLng: ride.dropOff.coords.coordinates[0],
          offerPrice: ride.offerPrice,
          status: ride.status.toLowerCase(),
          comments: ride.comments,
          createdAt: new Date(ride.createdAt),
          updatedAt: new Date(ride.updatedAt || ride.createdAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting passenger rides:', error);
      return [];
    }
  }

  // Get driver rides
  async getDriverRides(status?: string): Promise<Ride[]> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/rides/driver', { params });
      if (response.data.statusCode === 200) {
        // Transform the backend response to match our Ride interface
        return response.data.data.map((ride: any) => ({
          _id: ride._id,
          passenger: {
            _id: ride.passengerId,
            firstName: ride.passenger?.firstName || '',
            lastName: ride.passenger?.lastName || '',
            mobile: ride.passenger?.mobile || '',
          },
          driver: ride.driver ? {
            _id: ride.driver._id,
            firstName: ride.driver.firstName,
            lastName: ride.driver.lastName,
            mobile: ride.driver.mobile,
            rating: 0,
          } : undefined,
          vehicleType: {
            _id: ride.vehicleType,
            name: ride.vehicle?.name || '',
            basePrice: 0,
            pricePerKm: 0,
          },
          pickUpLocation: ride.pickUp.location,
          pickUpLat: ride.pickUp.coords.coordinates[1],
          pickUpLng: ride.pickUp.coords.coordinates[0],
          dropOffLocation: ride.dropOff.location,
          dropOffLat: ride.dropOff.coords.coordinates[1],
          dropOffLng: ride.dropOff.coords.coordinates[0],
          offerPrice: ride.offerPrice,
          status: ride.status.toLowerCase(),
          comments: ride.comments,
          createdAt: new Date(ride.createdAt),
          updatedAt: new Date(ride.updatedAt || ride.createdAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting driver rides:', error);
      return [];
    }
  }

  // Get ride offers for a specific ride
  async getRideOffers(rideId: string): Promise<RideOffer[]> {
    try {
      const response = await apiClient.get(`/rides/${rideId}/offers`);
      if (response.data.statusCode === 200) {
        // Transform the backend response to match our RideOffer interface
        return response.data.data.map((offer: any) => ({
          _id: offer._id,
          ride: offer.rideId,
          driver: {
            _id: offer.driver._id,
            firstName: offer.driver.firstName,
            lastName: offer.driver.lastName,
            mobile: offer.driver.mobile,
            rating: 0, // Not provided in new API
            vehicleDetails: {
              vehicleModel: offer.driverProfile?.vehicleModel || '',
              vehicleRegNum: offer.driverProfile?.vehicleRegNum || '',
            },
          },
          offeredPrice: offer.offerAmount,
          message: '', // Not provided in new API
          status: offer.status.toLowerCase(),
          createdAt: new Date(offer.createdAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting ride offers:', error);
      return [];
    }
  }

  // Get ride offers for passengers (alias for getRideOffers)
  async getRideOffersForPassenger(rideId: string): Promise<RideOffer[]> {
    return this.getRideOffers(rideId);
  }

  // Accept a ride offer (for passenger)
  async acceptRideOffer(rideId: string, offerId: string): Promise<boolean> {
    try {
      console.log('RideService: Accepting offer:', { rideId, offerId });
      
      // Try different endpoint patterns
      let response;
      
      // Pattern 1: PATCH with status update
      try {
        response = await apiClient.patch(`/rides/${rideId}/offers/${offerId}`, {
          status: 'accepted'
        });
        console.log('RideService: Accept offer response (pattern 1):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 1 failed:', error.response?.status);
      }
      
      // Pattern 2: POST to accept endpoint
      try {
        response = await apiClient.post(`/rides/${rideId}/offers/${offerId}/accept`);
        console.log('RideService: Accept offer response (pattern 2):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 2 failed:', error.response?.status);
      }
      
      // Pattern 3: PATCH to accept endpoint
      try {
        response = await apiClient.patch(`/rides/${rideId}/offers/${offerId}/accept`);
        console.log('RideService: Accept offer response (pattern 3):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 3 failed:', error.response?.status);
      }
      
      // Pattern 4: Accept through ride endpoint
      try {
        response = await apiClient.patch(`/rides/${rideId}/accept-offer`, {
          offerId: offerId
        });
        console.log('RideService: Accept offer response (pattern 4):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 4 failed:', error.response?.status);
      }
      
      console.error('RideService: All accept offer patterns failed');
      return false;
    } catch (error: any) {
      console.error('RideService: Error accepting ride offer:', error);
      return false;
    }
  }

  // Reject a ride offer (for passenger)
  async rejectRideOffer(rideId: string, offerId: string): Promise<boolean> {
    try {
      console.log('RideService: Rejecting offer:', { rideId, offerId });
      
      // Try different endpoint patterns
      let response;
      
      // Pattern 1: PATCH with status update
      try {
        response = await apiClient.patch(`/rides/${rideId}/offers/${offerId}`, {
          status: 'rejected'
        });
        console.log('RideService: Reject offer response (pattern 1):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 1 failed:', error.response?.status);
      }
      
      // Pattern 2: POST to reject endpoint
      try {
        response = await apiClient.post(`/rides/${rideId}/offers/${offerId}/reject`);
        console.log('RideService: Reject offer response (pattern 2):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 2 failed:', error.response?.status);
      }
      
      // Pattern 3: PATCH to reject endpoint
      try {
        response = await apiClient.patch(`/rides/${rideId}/offers/${offerId}/reject`);
        console.log('RideService: Reject offer response (pattern 3):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 3 failed:', error.response?.status);
      }
      
      // Pattern 4: Reject through ride endpoint
      try {
        response = await apiClient.patch(`/rides/${rideId}/reject-offer`, {
          offerId: offerId
        });
        console.log('RideService: Reject offer response (pattern 4):', response.data);
        return response.data.statusCode === 200;
      } catch (error: any) {
        console.log('RideService: Pattern 4 failed:', error.response?.status);
      }
      
      console.error('RideService: All reject offer patterns failed');
      return false;
    } catch (error: any) {
      console.error('RideService: Error rejecting ride offer:', error);
      return false;
    }
  }

  // Rate passenger (for driver) - Documented in API
  async ratePassenger(rideId: string, rating: number): Promise<boolean> {
    try {
      const response = await apiClient.patch(`/rides/${rideId}/rate-passenger`, { rating });
      return response.data.statusCode === 200;
    } catch (error) {
      console.error('Error rating passenger:', error);
      return false;
    }
  }

  // Rate driver (for passenger) - Documented in API
  async rateDriver(rideId: string, rating: number): Promise<boolean> {
    try {
      const response = await apiClient.patch(`/rides/${rideId}/rate-driver`, { rating });
      return response.data.statusCode === 200;
    } catch (error) {
      console.error('Error rating driver:', error);
      return false;
    }
  }

  // Cancel ride - NOTE: Not in API documentation
  async cancelRide(rideId: string): Promise<boolean> {
    try {
      const response = await apiClient.patch(`/rides/${rideId}/cancel`);
      return response.data.statusCode === 200;
    } catch (error) {
      console.error('Error cancelling ride:', error);
      return false;
    }
  }

  // Start ride (for driver) - NOTE: Not in API documentation
  async startRide(rideId: string): Promise<boolean> {
    try {
      const response = await apiClient.patch(`/rides/${rideId}/start`);
      return response.data.statusCode === 200;
    } catch (error) {
      console.error('Error starting ride:', error);
      return false;
    }
  }

  // Complete ride (for driver) - NOTE: Not in API documentation
  async completeRide(rideId: string): Promise<boolean> {
    try {
      const response = await apiClient.patch(`/rides/${rideId}/complete`);
      return response.data.statusCode === 200;
    } catch (error) {
      console.error('Error completing ride:', error);
      return false;
    }
  }

  // Get ride details - NOTE: Not in API documentation
  async getRideDetails(rideId: string): Promise<Ride | null> {
    try {
      const response = await apiClient.get(`/rides/${rideId}`);
      if (response.data.statusCode === 200) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting ride details:', error);
      return null;
    }
  }

  // Calculate estimated fare
  calculateEstimatedFare(
    distance: number,
    vehicleType: VehicleType,
    basePrice?: number
  ): number {
    console.log('Calculating fare with:', {
      distance,
      vehicleType,
      basePrice
    });
    
    // Validate vehicle type has required properties
    if (!vehicleType || typeof vehicleType.basePrice !== 'number' || typeof vehicleType.pricePerKm !== 'number') {
      console.warn('Invalid vehicle type, using default values:', vehicleType);
      // Use default values if vehicle type is invalid
      const defaultBasePrice = basePrice || 50; // Default base price
      const defaultPricePerKm = 15; // Default price per km
      const estimatedFare = defaultBasePrice + (distance * defaultPricePerKm);
      return Math.round(estimatedFare * 100) / 100;
    }
    
    const estimatedFare = vehicleType.basePrice + (distance * vehicleType.pricePerKm);
    console.log('Fare calculation:', {
      basePrice: vehicleType.basePrice,
      pricePerKm: vehicleType.pricePerKm,
      distance,
      estimatedFare
    });
    return Math.round(estimatedFare * 100) / 100; // Round to 2 decimal places
  }

  // Get all pending rides (for drivers to see available rides)
  async getAllPendingRides(): Promise<Ride[]> {
    try {
      console.log('RideService: Calling /rides/available endpoint...');
      console.log('RideService: Auth header:', apiClient.defaults.headers.Authorization);
      
      const response = await apiClient.get('/rides/available');
      console.log('RideService: API response:', response.data);
      
      if (response.data.statusCode === 200) {
        // Transform the backend response to match our Ride interface
        const transformedRides = response.data.data.map((ride: any) => ({
          _id: ride._id,
          passenger: {
            _id: ride.passenger._id,
            firstName: ride.passenger.firstName,
            lastName: ride.passenger.lastName,
            mobile: ride.passenger.mobile,
          },
          vehicleType: {
            _id: ride.vehicle._id,
            name: ride.vehicle.name,
            basePrice: 0, // Not provided in new API
            pricePerKm: 0, // Not provided in new API
          },
          pickUpLocation: ride.pickUp.location,
          pickUpLat: ride.pickUp.coords.coordinates[1], // Latitude is second coordinate
          pickUpLng: ride.pickUp.coords.coordinates[0], // Longitude is first coordinate
          dropOffLocation: ride.dropOff.location,
          dropOffLat: ride.dropOff.coords.coordinates[1],
          dropOffLng: ride.dropOff.coords.coordinates[0],
          offerPrice: ride.offerPrice,
          status: ride.status.toLowerCase(),
          comments: ride.comments,
          createdAt: new Date(ride.createdAt),
          updatedAt: new Date(ride.createdAt),
        }));
        
        console.log('RideService: Transformed rides:', transformedRides);
        return transformedRides;
      }
      console.log('RideService: No rides found or invalid response');
      return [];
    } catch (error: any) {
      console.error('RideService: Error getting available rides:', error);
      if (error.response) {
        console.error('RideService: Error response:', error.response.data);
        console.error('RideService: Error status:', error.response.status);
      }
      return [];
    }
  }

  // Make a ride offer (for drivers)
  async makeRideOffer(rideId: string, offeredPrice: number, message?: string): Promise<RideOffer | null> {
    try {
      const response = await apiClient.post(`/rides/${rideId}/offers`, {
        offerAmount: offeredPrice
      });
      if (response.data.statusCode === 201) {
        // Transform the backend response to match our RideOffer interface
        const offer = response.data.data;
        return {
          _id: offer._id,
          ride: offer.rideId,
          driver: {
            _id: offer.driver._id,
            firstName: offer.driver.firstName,
            lastName: offer.driver.lastName,
            mobile: offer.driver.mobile,
            rating: 0, // Not provided in new API
            vehicleDetails: {
              vehicleModel: '', // Not provided in new API
              vehicleRegNum: '', // Not provided in new API
            },
          },
          offeredPrice: offer.offerAmount,
          message: message || '',
          status: offer.status.toLowerCase(),
          createdAt: new Date(offer.createdAt),
        };
      }
      return null;
    } catch (error) {
      console.error('Error making ride offer:', error);
      throw error;
    }
  }
}

export const rideService = new RideService(); 