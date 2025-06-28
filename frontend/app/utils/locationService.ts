import * as Location from 'expo-location';
import apiClient from './apiClient';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface GoogleMapsPlace {
  place_id?: string;
  description?: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  // Backend response format
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  distance?: number;
}

export interface GoogleMapsDistance {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
}

class LocationService {
  private currentLocation: LocationData | null = null;

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Get current location
  async getCurrentLocation(): Promise<LocationData> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const currentLocation: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      this.currentLocation = currentLocation;
      return currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Test Google Maps API connectivity
  async testGoogleMapsAPI(): Promise<boolean> {
    try {
      console.log('Testing Google Maps API connectivity...');
      const response = await apiClient.get('/google-maps/search', {
        params: { query: 'test' }
      });
      console.log('Google Maps API test response:', response.data);
      return response.data.statusCode === 200;
    } catch (error: any) {
      console.error('Google Maps API test failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  // Search places using Google Maps API
  async searchPlaces(query: string): Promise<GoogleMapsPlace[]> {
    try {
      console.log('Searching places for query:', query);
      
      const response = await apiClient.get('/google-maps/search', {
        params: { query }
      });

      console.log('Search response:', response.data);

      if (response.data.statusCode === 200) {
        const results = response.data.data;
        console.log('Found places:', results);
        
        // Backend already returns the correct format, just add place_id for frontend compatibility
        if (results && results.length > 0) {
          const placesWithIds = results.map((place: any, index: number) => ({
            ...place,
            place_id: place.place_id || `place_${index}`,
            description: place.address, // For frontend compatibility
            structured_formatting: {
              main_text: place.name,
              secondary_text: place.address
            }
          }));
          console.log('Places with IDs:', placesWithIds);
          return placesWithIds;
        }
        
        // If backend returns empty results, try Autocomplete API as fallback
        console.log('Backend returned empty results, trying Autocomplete API...');
        const autocompleteResults = await this.searchPlacesWithAutocomplete(query);
        if (autocompleteResults.length > 0) {
          console.log('Autocomplete API returned results:', autocompleteResults);
          return autocompleteResults;
        }
        
        return [];
      }
      
      console.log('Search failed with status:', response.data.statusCode);
      
      // Try Autocomplete API as fallback
      console.log('Trying Autocomplete API as fallback...');
      const autocompleteResults = await this.searchPlacesWithAutocomplete(query);
      if (autocompleteResults.length > 0) {
        console.log('Autocomplete API returned results:', autocompleteResults);
        return autocompleteResults;
      }
      
      return [];
    } catch (error: any) {
      console.error('Error searching places:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Try Autocomplete API as fallback
      console.log('Trying Autocomplete API as fallback due to error...');
      try {
        const autocompleteResults = await this.searchPlacesWithAutocomplete(query);
        if (autocompleteResults.length > 0) {
          console.log('Autocomplete API returned results:', autocompleteResults);
          return autocompleteResults;
        }
      } catch (autocompleteError) {
        console.error('Autocomplete API also failed:', autocompleteError);
      }
      
      return [];
    }
  }

  // Fallback mock search results for testing
  private getMockSearchResults(query: string): GoogleMapsPlace[] {
    const mockPlaces: GoogleMapsPlace[] = [
      // Major Cities
      {
        place_id: '1',
        name: 'Kathmandu',
        address: 'Kathmandu, Nepal',
        location: { lat: 27.7172, lng: 85.3240 },
        description: 'Kathmandu, Nepal',
        structured_formatting: { main_text: 'Kathmandu', secondary_text: 'Nepal' }
      },
      {
        place_id: '2',
        name: 'Lalitpur',
        address: 'Lalitpur, Nepal',
        location: { lat: 27.6869, lng: 85.3000 },
        description: 'Lalitpur, Nepal',
        structured_formatting: { main_text: 'Lalitpur', secondary_text: 'Nepal' }
      },
      {
        place_id: '3',
        name: 'Bhaktapur',
        address: 'Bhaktapur, Nepal',
        location: { lat: 27.6869, lng: 85.4167 },
        description: 'Bhaktapur, Nepal',
        structured_formatting: { main_text: 'Bhaktapur', secondary_text: 'Nepal' }
      },
      {
        place_id: '4',
        name: 'Pokhara',
        address: 'Pokhara, Nepal',
        location: { lat: 28.2096, lng: 83.9856 },
        description: 'Pokhara, Nepal',
        structured_formatting: { main_text: 'Pokhara', secondary_text: 'Nepal' }
      },
      {
        place_id: '5',
        name: 'Biratnagar',
        address: 'Biratnagar, Nepal',
        location: { lat: 26.4525, lng: 87.2718 },
        description: 'Biratnagar, Nepal',
        structured_formatting: { main_text: 'Biratnagar', secondary_text: 'Nepal' }
      },
      {
        place_id: '6',
        name: 'Bharatpur',
        address: 'Bharatpur, Nepal',
        location: { lat: 27.6833, lng: 84.4333 },
        description: 'Bharatpur, Nepal',
        structured_formatting: { main_text: 'Bharatpur', secondary_text: 'Nepal' }
      },
      {
        place_id: '7',
        name: 'Butwal',
        address: 'Butwal, Nepal',
        location: { lat: 27.7000, lng: 83.4500 },
        description: 'Butwal, Nepal',
        structured_formatting: { main_text: 'Butwal', secondary_text: 'Nepal' }
      },
      {
        place_id: '8',
        name: 'Dharan',
        address: 'Dharan, Nepal',
        location: { lat: 26.8167, lng: 87.2833 },
        description: 'Dharan, Nepal',
        structured_formatting: { main_text: 'Dharan', secondary_text: 'Nepal' }
      },
      {
        place_id: '9',
        name: 'Bhairahawa',
        address: 'Bhairahawa, Nepal',
        location: { lat: 27.5000, lng: 83.4500 },
        description: 'Bhairahawa, Nepal',
        structured_formatting: { main_text: 'Bhairahawa', secondary_text: 'Nepal' }
      },
      {
        place_id: '10',
        name: 'Hetauda',
        address: 'Hetauda, Nepal',
        location: { lat: 27.4167, lng: 85.0333 },
        description: 'Hetauda, Nepal',
        structured_formatting: { main_text: 'Hetauda', secondary_text: 'Nepal' }
      },
      // Kathmandu Valley Areas
      {
        place_id: '11',
        name: 'Thamel',
        address: 'Thamel, Kathmandu, Nepal',
        location: { lat: 27.7172, lng: 85.3240 },
        description: 'Thamel, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Thamel', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '12',
        name: 'Durbar Square',
        address: 'Durbar Square, Kathmandu, Nepal',
        location: { lat: 27.7175, lng: 85.3245 },
        description: 'Durbar Square, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Durbar Square', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '13',
        name: 'Boudhanath Stupa',
        address: 'Boudhanath Stupa, Kathmandu, Nepal',
        location: { lat: 27.7218, lng: 85.3621 },
        description: 'Boudhanath Stupa, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Boudhanath Stupa', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '14',
        name: 'Swayambhunath Temple',
        address: 'Swayambhunath Temple, Kathmandu, Nepal',
        location: { lat: 27.7151, lng: 85.2901 },
        description: 'Swayambhunath Temple, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Swayambhunath Temple', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '15',
        name: 'Pashupatinath Temple',
        address: 'Pashupatinath Temple, Kathmandu, Nepal',
        location: { lat: 27.7106, lng: 85.3482 },
        description: 'Pashupatinath Temple, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Pashupatinath Temple', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '16',
        name: 'Patan Durbar Square',
        address: 'Patan Durbar Square, Lalitpur, Nepal',
        location: { lat: 27.6869, lng: 85.3000 },
        description: 'Patan Durbar Square, Lalitpur, Nepal',
        structured_formatting: { main_text: 'Patan Durbar Square', secondary_text: 'Lalitpur, Nepal' }
      },
      {
        place_id: '17',
        name: 'Bhaktapur Durbar Square',
        address: 'Bhaktapur Durbar Square, Bhaktapur, Nepal',
        location: { lat: 27.6869, lng: 85.4167 },
        description: 'Bhaktapur Durbar Square, Bhaktapur, Nepal',
        structured_formatting: { main_text: 'Bhaktapur Durbar Square', secondary_text: 'Bhaktapur, Nepal' }
      },
      // Popular Areas
      {
        place_id: '18',
        name: 'New Road',
        address: 'New Road, Kathmandu, Nepal',
        location: { lat: 27.7165, lng: 85.3235 },
        description: 'New Road, Kathmandu, Nepal',
        structured_formatting: { main_text: 'New Road', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '19',
        name: 'Asan',
        address: 'Asan, Kathmandu, Nepal',
        location: { lat: 27.7168, lng: 85.3238 },
        description: 'Asan, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Asan', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '20',
        name: 'Jawalakhel',
        address: 'Jawalakhel, Lalitpur, Nepal',
        location: { lat: 27.6869, lng: 85.3000 },
        description: 'Jawalakhel, Lalitpur, Nepal',
        structured_formatting: { main_text: 'Jawalakhel', secondary_text: 'Lalitpur, Nepal' }
      },
      {
        place_id: '21',
        name: 'Kirtipur',
        address: 'Kirtipur, Kathmandu, Nepal',
        location: { lat: 27.7175, lng: 85.3245 },
        description: 'Kirtipur, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Kirtipur', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '22',
        name: 'Gongabu',
        address: 'Gongabu, Kathmandu, Nepal',
        location: { lat: 27.7160, lng: 85.3230 },
        description: 'Gongabu, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Gongabu', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '23',
        name: 'Kalanki',
        address: 'Kalanki, Kathmandu, Nepal',
        location: { lat: 27.7162, lng: 85.3232 },
        description: 'Kalanki, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Kalanki', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '24',
        name: 'Baneshwor',
        address: 'Baneshwor, Kathmandu, Nepal',
        location: { lat: 27.7168, lng: 85.3238 },
        description: 'Baneshwor, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Baneshwor', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '25',
        name: 'Pulchowk',
        address: 'Pulchowk, Lalitpur, Nepal',
        location: { lat: 27.6869, lng: 85.3000 },
        description: 'Pulchowk, Lalitpur, Nepal',
        structured_formatting: { main_text: 'Pulchowk', secondary_text: 'Lalitpur, Nepal' }
      },
      // Airports and Transport
      {
        place_id: '26',
        name: 'Tribhuvan International Airport',
        address: 'Tribhuvan International Airport, Kathmandu, Nepal',
        location: { lat: 27.6967, lng: 85.3000 },
        description: 'Tribhuvan International Airport, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Tribhuvan International Airport', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '27',
        name: 'Pokhara Airport',
        address: 'Pokhara Airport, Pokhara, Nepal',
        location: { lat: 28.2096, lng: 83.9856 },
        description: 'Pokhara Airport, Pokhara, Nepal',
        structured_formatting: { main_text: 'Pokhara Airport', secondary_text: 'Pokhara, Nepal' }
      },
      {
        place_id: '28',
        name: 'Bharatpur Airport',
        address: 'Bharatpur Airport, Bharatpur, Nepal',
        location: { lat: 27.6833, lng: 84.4333 },
        description: 'Bharatpur Airport, Bharatpur, Nepal',
        structured_formatting: { main_text: 'Bharatpur Airport', secondary_text: 'Bharatpur, Nepal' }
      },
      // Universities and Institutions
      {
        place_id: '29',
        name: 'Tribhuvan University',
        address: 'Tribhuvan University, Kathmandu, Nepal',
        location: { lat: 27.7172, lng: 85.3240 },
        description: 'Tribhuvan University, Kathmandu, Nepal',
        structured_formatting: { main_text: 'Tribhuvan University', secondary_text: 'Kathmandu, Nepal' }
      },
      {
        place_id: '30',
        name: 'Kathmandu University',
        address: 'Kathmandu University, Dhulikhel, Nepal',
        location: { lat: 27.6167, lng: 85.5500 },
        description: 'Kathmandu University, Dhulikhel, Nepal',
        structured_formatting: { main_text: 'Kathmandu University', secondary_text: 'Dhulikhel, Nepal' }
      }
    ];

    // Filter mock places based on query (case-insensitive)
    const queryLower = query.toLowerCase().trim();
    const filteredPlaces = mockPlaces.filter(place => 
      place.address.toLowerCase().includes(queryLower) ||
      place.name.toLowerCase().includes(queryLower) ||
      (place.description && place.description.toLowerCase().includes(queryLower)) ||
      (place.structured_formatting && place.structured_formatting.main_text.toLowerCase().includes(queryLower)) ||
      (place.structured_formatting && place.structured_formatting.secondary_text.toLowerCase().includes(queryLower))
    );

    console.log(`Mock search: Found ${filteredPlaces.length} places for query "${query}"`);
    return filteredPlaces;
  }

  // Calculate distance using Haversine formula (fallback when API fails)
  private calculateDistanceHaversine(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Calculate distance between two points
  async calculateDistance(
    origin: string, 
    destination: string,
    originCoords?: { lat: number; lng: number },
    destinationCoords?: { lat: number; lng: number }
  ): Promise<GoogleMapsDistance | null> {
    try {
      console.log('Calculating distance with params:', {
        origin,
        destination,
        originCoords,
        destinationCoords
      });

      // If we have coordinates, use them directly
      if (originCoords && destinationCoords) {
        const params = { 
          originLat: originCoords.lat, // Send as number since backend expects numbers
          originLng: originCoords.lng,
          destinationLat: destinationCoords.lat,
          destinationLng: destinationCoords.lng
        };
        
        console.log('Using coordinates for distance calculation:', params);
        
        const response = await apiClient.get('/google-maps/distance', { params });
        
        console.log('Distance calculation response:', response.data);

        if (response.data.statusCode === 200) {
          return response.data.data;
        }
      }
      
      // Fallback to using location names (if coordinates not available)
      console.log('Using location names for distance calculation:', { origin, destination });
      
      const response = await apiClient.get('/google-maps/distance', {
        params: { origin, destination }
      });

      console.log('Distance calculation response (names):', response.data);

      if (response.data.statusCode === 200) {
        return response.data.data;
      }
      
      // If API fails, use Haversine formula as fallback
      if (originCoords && destinationCoords) {
        console.log('API failed, using Haversine formula as fallback');
        const distanceKm = this.calculateDistanceHaversine(
          originCoords.lat,
          originCoords.lng,
          destinationCoords.lat,
          destinationCoords.lng
        );
        
        console.log('Haversine calculation result:', {
          distanceKm,
          originCoords,
          destinationCoords
        });
        
        const result = {
          distance: {
            text: `${distanceKm.toFixed(1)} km`,
            value: distanceKm * 1000 // Convert to meters
          },
          duration: {
            text: `${Math.round(distanceKm * 3)} mins`, // Rough estimate: 3 mins per km
            value: Math.round(distanceKm * 3 * 60) // Convert to seconds
          }
        };
        
        console.log('Haversine fallback result:', result);
        return result;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error calculating distance:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        params: {
          origin,
          destination,
          originCoords,
          destinationCoords
        }
      });
      
      // If API fails, use Haversine formula as fallback
      if (originCoords && destinationCoords) {
        console.log('API failed, using Haversine formula as fallback');
        const distanceKm = this.calculateDistanceHaversine(
          originCoords.lat,
          originCoords.lng,
          destinationCoords.lat,
          destinationCoords.lng
        );
        
        console.log('Haversine calculation result:', {
          distanceKm,
          originCoords,
          destinationCoords
        });
        
        const result = {
          distance: {
            text: `${distanceKm.toFixed(1)} km`,
            value: distanceKm * 1000 // Convert to meters
          },
          duration: {
            text: `${Math.round(distanceKm * 3)} mins`, // Rough estimate: 3 mins per km
            value: Math.round(distanceKm * 3 * 60) // Convert to seconds
          }
        };
        
        console.log('Haversine fallback result:', result);
        return result;
      }
      
      return null;
    }
  }

  // Get current cached location
  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }

  // Update user location on backend
  async updateUserLocation(lat: number, lng: number): Promise<boolean> {
    try {
      // Use the correct field names as expected by the backend validation
      const requestData = {
        latitude: lat,
        longitude: lng
      };

      const response = await apiClient.patch('/me/location', requestData);
      return response.data.statusCode === 200;
    } catch (error: any) {
      // Log the specific error details for debugging
      if (error.response) {
        console.error('Error updating user location:', {
          status: error.response.status,
          data: error.response.data,
          message: error.response.data?.message || 'Unknown error'
        });
      } else {
        console.error('Error updating user location:', error.message);
      }
      
      // Return false but don't throw - this prevents the app from crashing
      return false;
    }
  }

  // Get saved addresses
  async getSavedAddresses(): Promise<any[]> {
    try {
      const response = await apiClient.get('/saved-addresses');
      if (response.data.statusCode === 200) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting saved addresses:', error);
      return [];
    }
  }

  // Save new address
  async saveAddress(addressData: {
    name: string;
    type: string;
    address: string;
    lat: number;
    lng: number;
  }): Promise<boolean> {
    try {
      const response = await apiClient.post('/saved-addresses', addressData);
      return response.data.statusCode === 201;
    } catch (error) {
      console.error('Error saving address:', error);
      return false;
    }
  }

  // Start location tracking
  async startLocationTracking(callback: (location: LocationData) => void): Promise<() => void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Update every 50 meters
        },
        async (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          this.currentLocation = locationData;
          callback(locationData);
          
          // Update location on backend - handle errors silently
          try {
            await this.updateUserLocation(locationData.latitude, locationData.longitude);
          } catch (error) {
            // Silently handle location update errors to prevent app crashes
            console.warn('Failed to update location on backend:', error);
          }
        }
      );

      return () => {
        subscription.remove();
      };
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  // Search places using Google Places Autocomplete API (fallback)
  async searchPlacesWithAutocomplete(query: string): Promise<GoogleMapsPlace[]> {
    try {
      console.log('Searching places with Autocomplete API for query:', query);
      
      // Try the new Places API first
      // TODO: Replace with your new API key from Google Cloud Console
      const apiKey = 'AIzaSyDbYiu_14LlULrCl6WXSNvTgEy3yBCKkQg'; // Your frontend API key
      const url = `https://places.googleapis.com/v1/places:autocomplete?key=${apiKey}`;
      
      const requestBody = {
        input: query,
        types: ['geocode'],
        components: ['country:np'],
        languageCode: 'en'
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.id,places.formattedAddress'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      console.log('New Places API response:', data);
      
      if (data.places && data.places.length > 0) {
        // Convert places to our format
        const places = data.places.map((place: any, index: number) => ({
          place_id: place.id,
          name: place.displayName?.text || place.formattedAddress,
          address: place.formattedAddress,
          location: {
            lat: 0, // We'll need to get details for coordinates
            lng: 0
          },
          description: place.formattedAddress,
          structured_formatting: {
            main_text: place.displayName?.text || place.formattedAddress,
            secondary_text: place.formattedAddress
          }
        }));
        
        console.log('Converted places from new API:', places);
        return places;
      }
      
      // If new API fails, try legacy API as fallback
      console.log('New Places API failed, trying legacy API...');
      return await this.searchPlacesWithLegacyAPI(query);
      
    } catch (error: any) {
      console.error('Error with new Places API:', error);
      
      // Try legacy API as fallback
      console.log('Trying legacy API as fallback...');
      return await this.searchPlacesWithLegacyAPI(query);
    }
  }

  // Fallback to legacy Places API
  private async searchPlacesWithLegacyAPI(query: string): Promise<GoogleMapsPlace[]> {
    try {
      const apiKey = 'AIzaSyDbYiu_14LlULrCl6WXSNvTgEy3yBCKkQg';
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&types=geocode&components=country:np`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Legacy API response:', data);
      
      if (data.status === 'OK' && data.predictions) {
        // Convert predictions to our format
        const places = data.predictions.map((prediction: any, index: number) => ({
          place_id: prediction.place_id,
          name: prediction.structured_formatting?.main_text || prediction.description,
          address: prediction.description,
          location: {
            lat: 0, // We'll need to get details for coordinates
            lng: 0
          },
          description: prediction.description,
          structured_formatting: prediction.structured_formatting
        }));
        
        console.log('Converted places from legacy API:', places);
        return places;
      }
      
      console.log('Legacy API also returned no results, using mock data');
      return this.getMockSearchResults(query);
    } catch (error: any) {
      console.error('Error with legacy API:', error);
      console.log('Using mock data as final fallback');
      return this.getMockSearchResults(query);
    }
  }

  // Get place details with coordinates
  async getPlaceDetails(placeId: string): Promise<GoogleMapsPlace | null> {
    try {
      const apiKey = 'AIzaSyDbYiu_14LlULrCl6WXSNvTgEy3yBCKkQg';
      
      // Try new Places API first
      const url = `https://places.googleapis.com/v1/places/${placeId}?key=${apiKey}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'displayName,formattedAddress,location'
        }
      });
      
      const data = await response.json();
      console.log('New Places API details response:', data);
      
      if (data.displayName && data.location) {
        return {
          place_id: placeId,
          name: data.displayName.text,
          address: data.formattedAddress,
          location: {
            lat: data.location.latitude,
            lng: data.location.longitude
          },
          description: data.formattedAddress,
          structured_formatting: {
            main_text: data.displayName.text,
            secondary_text: data.formattedAddress
          }
        };
      }
      
      // If new API fails, try legacy API
      console.log('New Places API details failed, trying legacy API...');
      return await this.getPlaceDetailsLegacy(placeId);
      
    } catch (error) {
      console.error('Error with new Places API details:', error);
      
      // Try legacy API as fallback
      console.log('Trying legacy API details as fallback...');
      return await this.getPlaceDetailsLegacy(placeId);
    }
  }

  // Fallback to legacy Places API for details
  private async getPlaceDetailsLegacy(placeId: string): Promise<GoogleMapsPlace | null> {
    try {
      const apiKey = 'AIzaSyDbYiu_14LlULrCl6WXSNvTgEy3yBCKkQg';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,name,formatted_address&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Legacy API details response:', data);
      
      if (data.status === 'OK' && data.result) {
        return {
          place_id: placeId,
          name: data.result.name,
          address: data.result.formatted_address,
          location: {
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng
          },
          description: data.result.formatted_address,
          structured_formatting: {
            main_text: data.result.name,
            secondary_text: data.result.formatted_address
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error with legacy API details:', error);
      return null;
    }
  }
}

export const locationService = new LocationService(); 