import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './apiClient';

export interface WebSocketResponse {
  code: number;
  message?: string;
  data?: any;
}

export interface RideOfferWebSocket {
  _id: string;
  rideId: string;
  driverId: string;
  offerAmount: number;
  status: string;
  driver: {
    _id: string;
    firstName: string;
    lastName: string;
    mobile: string;
  };
  driverProfile?: {
    vehicleModel: string;
    vehicleRegNum: string;
  };
}

class WebSocketService {
  private sockets: { [key: string]: Socket | null } = {};
  private isConnected: { [key: string]: boolean } = {};
  private connectionPromises: { [key: string]: Promise<void> | null } = {};
  private baseUrl: string = 'http://192.168.0.2:9000';

  async connect(rideId?: string, namespace: 'driver' | 'passenger' | 'ride' = 'driver'): Promise<void> {
    try {
      // Check if already connected to this namespace
      if (this.sockets[namespace]?.connected) {
        console.log(`WebSocket: Already connected to ${namespace} namespace`);
        return;
      }

      // Get token from storage
      const token = await getAccessToken();
      console.log('WebSocket: Using token:', token);
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build namespace path
      let namespacePath: string;
      let queryParams: any = {};
      
      if (namespace === 'ride') {
        namespacePath = 'io/v1/ride';
        queryParams = { rideId };
      } else {
        namespacePath = `io/v1/${namespace}`;
      }

      const url = `${this.baseUrl}/${namespacePath}`;
      console.log(`WebSocket: Connecting to ${namespace} namespace for ride ${rideId || 'N/A'}`);
      console.log('WebSocket: Connecting to URL:', url);

      // Create socket connection
      this.sockets[namespace] = io(url, {
        auth: { token },
        query: queryParams,
        extraHeaders: {
          Authorization: `Bearer ${token}`
        },
        transports: ['websocket'],
        timeout: 20000,
        forceNew: true,
      });

      const socket = this.sockets[namespace];

      // Setup connection handlers
      socket.on('connect', () => {
        console.log(`WebSocket: Connected to ${namespace} namespace`);
        this.isConnected[namespace] = true;
        // Join the ride room after connecting to the 'ride' namespace
        if (namespace === 'ride' && rideId) {
          const room = `ride_${rideId}`;
          socket.emit('join', room);
          console.log(`WebSocket: Emitted join for room: ${room}`);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`WebSocket: Disconnected from ${namespace} namespace:`, reason);
        this.isConnected[namespace] = false;
        this.connectionPromises[namespace] = null;
      });

      socket.on('connect_error', (error) => {
        console.error(`WebSocket: Connection error to ${namespace} namespace:`, error);
        this.isConnected[namespace] = false;
      });

      socket.on('error', (error) => {
        console.error(`WebSocket: Error in ${namespace} namespace:`, error);
      });

      // Setup event listeners for this namespace
      this.setupEventListeners(socket, namespace);

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        socket.once('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });

        socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      console.error(`WebSocket: Connection failed to ${namespace} namespace:`, error);
      this.isConnected[namespace] = false;
      throw error;
    }
  }

  private setupEventListeners(socket: Socket, namespace: string) {
    // Common events for all namespaces
    socket.on('connect', () => {
      console.log(`WebSocket: Connected to ${namespace} namespace`);
      this.isConnected[namespace] = true;
    });

    socket.on('disconnect', (reason) => {
      console.log(`WebSocket: Disconnected from ${namespace} namespace:`, reason);
      this.isConnected[namespace] = false;
    });

    socket.on('error', (error: any) => {
      // Suppress expected 400 errors for location updates
      if (error && error.code === 400 && error.message === 'Failed to update location') {
        // This is an expected error when passengers try to send location updates
        // or when the ride status doesn't allow location updates
        console.log(`WebSocket: Suppressed expected 400 error for location update in ${namespace} namespace`);
        return;
      }
      
      // Suppress other common expected errors
      if (error && error.code === 400) {
        console.log(`WebSocket: Suppressed expected 400 error in ${namespace} namespace:`, error.message);
        return;
      }
      
      // Log other errors normally
      console.error(`WebSocket: Error in ${namespace} namespace:`, error);
    });
    
    // Also handle connection errors
    socket.on('connect_error', (error) => {
      console.error(`WebSocket: Connection error in ${namespace} namespace:`, error);
    });

    // Namespace-specific events
    if (namespace === 'driver') {
      this.setupDriverEvents(socket);
    } else if (namespace === 'passenger') {
      this.setupPassengerEvents(socket);
    } else if (namespace === 'ride') {
      this.setupRideEvents(socket);
    }
  }

  private setupDriverEvents(socket: Socket) {
    // Driver-specific events
    socket.on('newRideRequest', (data) => {
      console.log('WebSocket: New ride request event received:', data);
      this.emit('newRideRequest', data, 'driver');
    });

    socket.on('offerAccepted', (data) => {
      console.log('WebSocket: Offer accepted event received:', data);
      this.emit('offerAccepted', data, 'driver');
    });
  }

  private setupPassengerEvents(socket: Socket) {
    // Passenger-specific events
    socket.on('newOffer', (data) => {
      console.log('WebSocket: New offer event received:', data);
      this.emit('newOffer', data, 'passenger');
    });

    socket.on('rideAccepted', (data) => {
      console.log('WebSocket: Ride accepted event received:', data);
      this.emit('rideAccepted', data, 'passenger');
    });
  }

  private setupRideEvents(socket: Socket) {
    // Ride-specific events
    socket.on('rideDetails', (data) => {
      console.log('WebSocket: Ride details event received:', data);
      this.emit('rideDetails', data, 'ride');
    });

    socket.on('rideStarted', (data) => {
      console.log('WebSocket: Ride started event received:', data);
      this.emit('rideStarted', data, 'ride');
    });

    socket.on('rideCompleted', (data) => {
      console.log('WebSocket: Ride completed event received:', data);
      this.emit('rideCompleted', data, 'ride');
    });

    socket.on('rideCancelled', (data) => {
      console.log('WebSocket: Ride cancelled event received:', data);
      this.emit('rideCancelled', data, 'ride');
    });

    socket.on('rideStatusUpdate', (data) => {
      console.log('WebSocket: Ride status update received:', data);
      this.emit('rideStatusUpdate', data, 'ride');
    });

    socket.on('rideProgressUpdate', (data) => {
      console.log('WebSocket: Ride progress update received:', data);
      this.emit('rideProgressUpdate', data, 'ride');
    });

    socket.on('rideLocationUpdated', (data) => {
      console.log('WebSocket: Ride location update received:', data);
      this.emit('rideLocationUpdated', data, 'ride');
    });

    // Handle errors with suppression for expected cases
    socket.on('error', (error: any) => {
      // Suppress expected 400 errors for location updates
      if (error && error.code === 400 && error.message === 'Failed to update location') {
        // This is an expected error when passengers try to send location updates
        // or when the ride status doesn't allow location updates
        console.log('WebSocket: Suppressed expected 400 error for location update');
        return;
      }
      
      // Log other errors normally
      console.error('WebSocket: Error in ride namespace:', error);
    });
  }

  // Check connection status for specific namespace
  isSocketConnected(namespace: 'driver' | 'passenger' | 'ride' = 'driver'): boolean {
    return this.isConnected[namespace] && this.sockets[namespace]?.connected || false;
  }

  // Get socket instance for specific namespace
  getSocket(namespace: 'driver' | 'passenger' | 'ride' = 'driver'): Socket | null {
    return this.sockets[namespace] || null;
  }

  // Emit event to specific namespace
  emit(event: string, data?: any, namespace: 'driver' | 'passenger' | 'ride' = 'driver') {
    const socket = this.sockets[namespace];
    if (socket && socket.connected) {
      socket.emit(event, data);
    } else {
      console.error(`WebSocket: Cannot emit event to ${namespace} namespace, socket not connected`);
    }
  }

  // Listen for events on specific namespace
  on(event: string, callback: (data: any) => void, namespace: 'driver' | 'passenger' | 'ride' = 'driver') {
    const socket = this.sockets[namespace];
    if (socket) {
      socket.on(event, callback);
    }
  }

  // Remove event listener from specific namespace
  off(event: string, callback?: (data: any) => void, namespace: 'driver' | 'passenger' | 'ride' = 'driver') {
    const socket = this.sockets[namespace];
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }

  // Emit event with callback (for request-response pattern)
  emitEvent(event: string, data?: any, callback?: (response: any) => void, namespace: 'driver' | 'passenger' | 'ride' = 'driver'): void {
    const socket = this.sockets[namespace];
    if (socket && socket.connected) {
      if (event === 'updateRideLocation') {
        console.log(`[websocketService] Emitting updateRideLocation to ${namespace} namespace:`, data);
      } else if (event === 'pingStatus') {
        console.log(`[websocketService] Emitting pingStatus to ${namespace} namespace:`, data);
      } else if (event === 'rideProgressUpdate') {
        console.log(`[websocketService] Emitting rideProgressUpdate:`, data);
      }
      if (callback) {
        socket.emit(event, data, callback);
      } else {
        socket.emit(event, data);
      }
    } else {
      console.error(`WebSocket: Cannot emit event to ${namespace} namespace, socket not connected`);
    }
  }

  // Disconnect from specific namespace
  disconnect(namespace?: 'driver' | 'passenger' | 'ride') {
    if (namespace) {
      if (this.sockets[namespace]) {
        console.log(`WebSocket: Disconnecting from ${namespace} namespace...`);
        this.sockets[namespace].disconnect();
        this.sockets[namespace] = null;
        this.isConnected[namespace] = false;
        this.connectionPromises[namespace] = null;
      }
    } else {
      // Disconnect from all namespaces
      Object.keys(this.sockets).forEach(ns => {
        if (this.sockets[ns]) {
          console.log(`WebSocket: Disconnecting from ${ns} namespace...`);
          this.sockets[ns].disconnect();
        }
      });
      this.sockets = {};
      this.isConnected = {};
      this.connectionPromises = {};
    }
  }

  async sendRideRequest(rideId: string, offerPrice: number) {
    console.log('Connecting to ride WS with rideId:', rideId);
    await this.connect(rideId, 'passenger');
    console.log('Emitting sendRideRequest for rideId:', rideId, 'with offerPrice:', offerPrice);
    this.emit('sendRideRequest', { offerPrice });
  }

  // Reconnect all sockets with new token (after token refresh)
  async reconnectAllWithNewToken() {
    const namespaces: Array<'driver' | 'passenger' | 'ride'> = ['driver', 'passenger', 'ride'];
    for (const ns of namespaces) {
      if (this.sockets[ns]) {
        try {
          this.disconnect(ns);
          // For 'ride', we need to pass rideId if available
          let rideId;
          if (ns === 'ride' && this.sockets[ns]?.io?.opts?.query?.rideId) {
            rideId = this.sockets[ns].io.opts.query.rideId;
          }
          await this.connect(rideId, ns);
        } catch (err) {
          console.error(`WebSocket: Failed to reconnect ${ns} namespace after token refresh:`, err);
        }
      }
    }
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;
export { WebSocketService };