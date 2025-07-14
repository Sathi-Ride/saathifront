import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthWsMiddleware } from 'src/auth/auth-ws.middleware';
import { Logger, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { IWsResponse } from '../ws-response';
import { RideService } from 'src/ride/ride.service';
import { validateRideMiddleware } from 'src/ride/validate-ride.middleware';
import { Ride, RideStatus } from 'src/ride/schemas/ride.schema';
import { DriverGateway } from './driver.gateway';
import { WsExceptionFilter } from '../ws-exception.filter';
import { WsValidationPipe } from '../ws-validation.pipe';
import { WsAuthGuard } from 'src/auth/ws-auth.guard';
import { OfferStatus, RideOffer } from 'src/ride/schemas/ride-offer.schema';
import ChangeRideOfferStatusDto from '../dto/change-ride-offer-status.dto';
import RideOfferService from 'src/ride/ride-offer.service';
import { User } from 'src/user/schemas/user.schema';
import CancelRideDto from 'src/ride/dto/cancel-ride.dto';
import { OnEvent } from '@nestjs/event-emitter';
import { RIDE_EVENTS } from 'src/constants';
import { UpdateLocationDto } from 'src/user/dto/update-location.dto';
import { RoomService } from '../room.service';
import { SendRideRequestDto } from '../dto/send-ride-request.dto';
import { Message } from 'src/ride/schemas/message.schema';
import { MessageService } from 'src/ride/message.service';
import DeleteMessageDto from 'src/ride/dto/delete-message.dto';

@UseFilters(WsExceptionFilter)
@UsePipes(WsValidationPipe)
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: 'io/v1/ride',
  serveClient: false,
  cors: {
    origin: '*',
  },
})
export class RideGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RideGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly roomService: RoomService,
    private readonly rideService: RideService,
    private readonly rideOfferService: RideOfferService,
    private readonly messageService: MessageService,
  ) {}

  @WebSocketServer()
  server: Server;

  async afterInit(server: Server) {
    server.use(AuthWsMiddleware(this.jwtService));
    server.use(validateRideMiddleware(this.rideService));
  }

  handleConnection(client: Socket) {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      
      if (!rideId) {
        this.logger.warn(`Client ${client.id} attempted to connect without rideId`);
        client.disconnect();
        return;
      }

      const room = this.roomService.getRideRoomName(rideId);
      client.join(room);
      const user = client['user'] as User;

      this.logger.log(`Client connected: ${client.id} in room: ${room} for user: ${user?.id}`);

      const connectionRes: IWsResponse = {
        code: 200,
        message: `${user?.id || 'Unknown user'} joined room ${room}`,
      };

      this.server.to(room).emit('connected', connectionRes);
    } catch (error) {
      this.logger.error(`Error in handleConnection for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      if (rideId) {
        const room = this.roomService.getRideRoomName(rideId);
        client.leave(room);
        this.logger.log(`Client disconnected: ${client.id} from room: ${room}`);
      } else {
        this.logger.log(`Client disconnected: ${client.id} (no rideId)`);
      }
    } catch (error) {
      this.logger.error(`Error in handleDisconnect for client ${client.id}:`, error);
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_OFFER_DISCARDED)
  async handleRideOfferDiscarded(rideOffer: RideOffer) {
    try {
      const room = this.roomService.getRideRoomName(rideOffer.rideId.toString());
      this.server.to(room).emit('rideOfferDiscarded', {
        code: 201,
        data: rideOffer,
      });
    } catch (error) {
      this.logger.error('Error handling ride offer discarded event:', error);
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_OFFER_SUBMITTED)
  async handleRideOfferSubmitted(rideOffer: RideOffer) {
    try {
      const room = this.roomService.getRideRoomName(rideOffer.rideId.toString());
      this.server.to(room).emit('rideOfferSubmitted', {
        code: 201,
        data: rideOffer,
      });
    } catch (error) {
      this.logger.error('Error handling ride offer submitted event:', error);
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_OFFER_WITHDRAWN)
  async handleRideOfferWithdrawn(rideOffer: RideOffer) {
    try {
      const room = this.roomService.getRideRoomName(rideOffer.rideId.toString());
      this.server.to(room).emit('rideOfferWithdrawn', {
        code: 201,
        data: rideOffer,
      });
    } catch (error) {
      this.logger.error('Error handling ride offer withdrawn event:', error);
    }
  }

  @SubscribeMessage('sendRideRequest')
  async sendRideRequest(
    @MessageBody() sendRideRequestDto: SendRideRequestDto,
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse<Ride>> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      this.logger.log(`sendRideRequest event received for rideId: ${rideId}`, sendRideRequestDto);
      
      const ride = await this.rideService.sendRideRequestToNearbyDrivers(
        rideId,
        sendRideRequestDto,
      );

      return {
        code: 201,
        data: ride,
      };
    } catch (error) {
      this.logger.error('Error in sendRideRequest:', error);
      throw error;
    }
  }

  @SubscribeMessage('getRideOffers')
  async getRideOffers(
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse<RideOffer[]>> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      const rideOffers = await this.rideOfferService.getRideOffersByRideId(rideId);

      return {
        code: 200,
        data: rideOffers,
      };
    } catch (error) {
      this.logger.error('Error in getRideOffers:', error);
      throw error;
    }
  }

  @SubscribeMessage('acceptRideOffer')
  async acceptRideOffer(
    @MessageBody() changeRideOfferStatusDto: ChangeRideOfferStatusDto,
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      const rideOfferId = changeRideOfferStatusDto.rideOfferId?.toString();
      if (!rideOfferId) {
        throw new WsException('Ride offer ID is required');
      }

      const ride = await this.rideService.getRideById(rideId);
      const rideOffer = await this.rideOfferService.getRideOfferById(rideOfferId);

      if (ride.status !== RideStatus.SEARCHING) {
        throw new WsException('Ride is not in searching status');
      }

      if (rideOffer.status !== OfferStatus.SUBMITTED) {
        throw new WsException('Ride offer is not in submitted status');
      }

      await this.rideService.acceptRideOffer(rideId, rideOfferId);

      return {
        code: 201,
        message: 'Ride offer accepted successfully',
      };
    } catch (error) {
      this.logger.error('Error in acceptRideOffer:', error);
      throw error;
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_ACCEPTED)
  handleRideAccepted(ride: Ride) {
    try {
      const room = this.roomService.getRideRoomName(ride.id.toString());
      this.server.to(room).emit('rideAccepted', {
        code: 201,
        data: ride,
      });
    } catch (error) {
      this.logger.error('Error handling ride accepted event:', error);
    }
  }

  @SubscribeMessage('rejectRideOffer')
  async rejectRideOffer(
    @MessageBody() changeRideOfferStatusDto: ChangeRideOfferStatusDto,
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse<RideOffer>> {
    try {
      const rideOfferId = changeRideOfferStatusDto.rideOfferId?.toString();
      if (!rideOfferId) {
        throw new WsException('Ride offer ID is required');
      }

      const existingOffer = await this.rideOfferService.getRideOfferById(rideOfferId);

      if (existingOffer.status !== OfferStatus.SUBMITTED) {
        throw new WsException('Can only reject submitted offers');
      }

      const rideOffer = await this.rideOfferService.rejectOffer(rideOfferId);

      return {
        code: 201,
        data: rideOffer,
      };
    } catch (error) {
      this.logger.error('Error in rejectRideOffer:', error);
      throw error;
    }
  }

  @SubscribeMessage('cancelRide')
  async cancelRide(
    @MessageBody() cancelRideDto: CancelRideDto,
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse> {
    try {
      const userId = client['user']?.id;
      const rideId = client.handshake.query.rideId?.toString();
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      if (!userId) {
        throw new WsException('User authentication required');
      }

      const ride = await this.rideService.getRideById(rideId);

      if (
        ride.status === RideStatus.CANCELLED ||
        ride.status === RideStatus.COMPLETED
      ) {
        throw new WsException('Ride is not in cancelable status');
      }

      await this.rideService.cancelRide(
        rideId,
        userId,
        cancelRideDto.cancellationReason,
      );

      return {
        code: 201,
        message: 'Ride cancelled successfully',
      };
    } catch (error) {
      this.logger.error('Error in cancelRide:', error);
      throw error;
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_CANCELLED)
  async handleRideCancelledEvent(ride: Ride) {
    try {
      const room = this.roomService.getRideRoomName(ride.id.toString());

      this.server.to(room).emit('rideCancelled', {
        code: 201,
        data: ride,
      });

      if (ride.status === RideStatus.SEARCHING) {
        const riderOffers = await this.rideOfferService.getRideOffersByRideId(
          ride.id,
        );

        riderOffers.forEach((offer) => {
          const driverRoom = this.roomService.getDriverRoomName(
            offer.driverId.toString(),
          );

          this.server.to(driverRoom).emit('rideCancelled', {
            code: 201,
            data: {
              id: ride.id,
            },
          });
        });
      }
    } catch (error) {
      this.logger.error('Error handling ride cancelled event:', error);
    }
  }

  @SubscribeMessage('startRide')
  async startRide(@ConnectedSocket() client: Socket): Promise<IWsResponse> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      const userId = client['user']?.id;
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      if (!userId) {
        throw new WsException('User authentication required');
      }

      const ride = await this.rideService.getRideById(rideId);

      if (ride.status !== RideStatus.ACCEPTED) {
        throw new WsException('Ride is not in accepted status');
      }

      if (ride.driverId.toString() !== userId) {
        throw new WsException('Only driver can start ride');
      }

      await this.rideService.startRide(rideId);

      return {
        code: 201,
        message: 'Ride started successfully',
      };
    } catch (error) {
      this.logger.error('Error in startRide:', error);
      throw error;
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_STARTED)
  handleRideStartedEvent(ride: Ride) {
    try {
      const room = this.roomService.getRideRoomName(ride.id.toString());

      this.server.to(room).emit('rideStarted', {
        code: 201,
        data: ride,
      });
    } catch (error) {
      this.logger.error('Error handling ride started event:', error);
    }
  }

  @SubscribeMessage('updateRideLocation')
  async updateRideLocation(
    @MessageBody() payload: UpdateLocationDto & { progress?: number },
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      const userId = client['user']?.id;
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      if (!userId) {
        throw new WsException('User authentication required');
      }

      const ride = await this.rideService.getRideById(rideId);

      // Add detailed logging
      this.logger.log('[updateRideLocation]', {
        userId,
        rideDriverId: ride?.driverId,
        rideStatus: ride?.status,
        payload,
      });

      if (!ride) {
        throw new WsException('Ride not found');
      }

      if (![RideStatus.ACCEPTED, RideStatus.ONGOING].includes(ride.status)) {
        throw new WsException(`Ride is not in accepted/ongoing status (current: ${ride.status})`);
      }

      if (ride.driverId.toString() !== userId) {
        throw new WsException(`Only driver can update ride location (userId: ${userId}, driverId: ${ride.driverId})`);
      }

      const { progress, ...updateLocationDto } = payload;
      await this.rideService.updateRideLocation(rideId, updateLocationDto, progress);

      return {
        code: 201,
        message: 'Ride location updated successfully',
      };
    } catch (error) {
      this.logger.error('Error in updateRideLocation:', error);
      throw error;
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_LOCATION_UPDATED)
  handleRideLocationUpdatedEvent(ride: Ride) {
    try {
      const room = this.roomService.getRideRoomName(ride.id.toString());

      this.server.to(room).emit('rideLocationUpdated', {
        code: 201,
        data: ride,
      });
    } catch (error) {
      this.logger.error('Error handling ride location updated event:', error);
    }
  }

  @SubscribeMessage('endRide')
  async endRide(@ConnectedSocket() client: Socket): Promise<IWsResponse> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      const userId = client['user']?.id;
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      if (!userId) {
        throw new WsException('User authentication required');
      }

      const ride = await this.rideService.getRideById(rideId);

      if (ride.status !== RideStatus.ONGOING) {
        throw new WsException('Ride is not in ongoing status');
      }

      if (ride.driverId.toString() !== userId) {
        throw new WsException('Only driver can end ride');
      }

      await this.rideService.endRide(rideId);

      return {
        code: 201,
        message: 'Ride ended successfully',
      };
    } catch (error) {
      this.logger.error('Error in endRide:', error);
      throw error;
    }
  }

  @OnEvent(RIDE_EVENTS.RIDE_COMPLETED)
  handleRideCompletedEvent(ride: Ride) {
    try {
      const room = this.roomService.getRideRoomName(ride.id.toString());

      this.server.to(room).emit('rideCompleted', {
        code: 201,
        data: ride,
      });
    } catch (error) {
      this.logger.error('Error handling ride completed event:', error);
    }
  }

  @SubscribeMessage('getAllOffers')
  async getAllOffers(
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse<RideOffer[]>> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      const rideOffers = await this.rideOfferService.getRideOffersByRideId(rideId);

      return {
        code: 200,
        data: rideOffers,
      };
    } catch (error) {
      this.logger.error('Error in getAllOffers:', error);
      throw error;
    }
  }

  @SubscribeMessage('getAllMessages')
  async getAllMessages(
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse<Message[]>> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      const messages = await this.messageService.findAll(rideId);

      return {
        code: 200,
        data: messages,
      };
    } catch (error) {
      this.logger.error('Error in getAllMessages:', error);
      throw error;
    }
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody() content: string,
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse<Message>> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      const userId = client['user']?.id;
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      if (!userId) {
        throw new WsException('User authentication required');
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new WsException('Message content is required');
      }

      const message = await this.messageService.create(rideId, userId, content.trim());

      const room = this.roomService.getRideRoomName(rideId);
      this.server.to(room).emit('messageCreated', {
        code: 201,
        data: message,
      });

      return {
        code: 201,
        message: 'Message sent successfully',
      };
    } catch (error) {
      this.logger.error('Error in sendMessage:', error);
      throw error;
    }
  }

  @SubscribeMessage('deleteMessage')
  async deleteMessage(
    @MessageBody() deleteMessageDto: DeleteMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<IWsResponse<Message>> {
    try {
      const userId = client['user']?.id;
      const rideId = client.handshake.query.rideId?.toString();
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      if (!userId) {
        throw new WsException('User authentication required');
      }

      if (!deleteMessageDto.messageId) {
        throw new WsException('Message ID is required');
      }

      const message = await this.messageService.delete(
        deleteMessageDto.messageId,
        userId,
      );

      const room = this.roomService.getRideRoomName(rideId);
      this.server.to(room).emit('messageDeleted', {
        code: 200,
        data: message,
      });

      return {
        code: 200,
        message: 'Message deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error in deleteMessage:', error);
      throw error;
    }
  }

  @SubscribeMessage('isTyping')
  async handleIsTyping(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      const userId = client['user']?.id;
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      if (!userId) {
        throw new WsException('User authentication required');
      }

      const room = this.roomService.getRideRoomName(rideId);
      this.server.to(room).emit('isTyping', {
        code: 200,
        data: { userId },
      });
    } catch (error) {
      this.logger.error('Error in handleIsTyping:', error);
      throw error;
    }
  }

  @SubscribeMessage('rideLocationUpdated')
  async handleLocationUpdate(
    @MessageBody() data: { rideId: string; latitude: number; longitude: number; progress?: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { rideId, latitude, longitude, progress } = data;
      
      this.logger.log(`[handleLocationUpdate] Received data:`, { rideId, latitude, longitude, progress });
      
      // Validate rideId
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      // Validate rideId format (MongoDB ObjectId)
      if (!/^[0-9a-fA-F]{24}$/.test(rideId)) {
        throw new WsException(`Invalid ride ID format: ${rideId}`);
      }

      // Validate coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new WsException('Invalid coordinates provided');
      }

      // Check if ride exists first
      const ride = await this.rideService.getRideById(rideId);
      if (!ride) {
        throw new WsException(`Ride not found with ID: ${rideId}`);
      }

      this.logger.log(`[handleLocationUpdate] Found ride:`, { 
        rideId: ride.id, 
        status: ride.status, 
        driverId: ride.driverId 
      });

      // Update ride with driver's new location and progress
      await this.rideService.updateDriverLocation(rideId, { lat: latitude, lng: longitude }, progress);
      
      // Broadcast to all clients in the ride room
      const room = this.roomService.getRideRoomName(rideId);
      this.server.to(room).emit('rideLocationUpdated', { rideId, latitude, longitude, progress });
      
      this.logger.log(`[handleLocationUpdate] Successfully updated location for ride ${rideId}`);
      
      return { code: 200, message: 'Location updated successfully' };
    } catch (error) {
      this.logger.error(`Failed to update location for ride ${data?.rideId}:`, error.message);
      this.logger.error(`Error stack:`, error.stack);
      
      // Provide more specific error messages
      if (error instanceof WsException) {
        throw error;
      }
      
      if (error.message?.includes('Ride not found')) {
        throw new WsException(`Ride not found: ${data?.rideId}`);
      }
      
      throw new WsException(`Failed to update location: ${error.message}`);
    }
  }

  @SubscribeMessage('rideProgressUpdate')
  async handleProgressUpdate(
    @MessageBody() data: { rideId: string; progress: number; currentLocation?: { lat: number; lng: number } },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { rideId, progress, currentLocation } = data;
      
      // Validate rideId
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      // Validate progress
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        throw new WsException('Progress must be a number between 0 and 100');
      }

      // Check if ride exists first
      const ride = await this.rideService.getRideById(rideId);
      if (!ride) {
        throw new WsException(`Ride not found with ID: ${rideId}`);
      }

      // Update ride progress in the database
      await this.rideService.updateRideProgress(rideId, progress, currentLocation);
      
      // Broadcast to all clients in the ride room
      const room = this.roomService.getRideRoomName(rideId);
      this.server.to(room).emit('rideProgressUpdate', { rideId, progress, currentLocation });
      
      return { code: 200, message: 'Progress updated successfully' };
    } catch (error) {
      this.logger.error(`Failed to update progress for ride ${data?.rideId}:`, error.message);
      
      // Provide more specific error messages
      if (error instanceof WsException) {
        throw error;
      }
      
      if (error.message?.includes('Ride not found')) {
        throw new WsException(`Ride not found: ${data?.rideId}`);
      }
      
      throw new WsException(`Failed to update progress: ${error.message}`);
    }
  }

  @SubscribeMessage('getRideProgress')
  async getRideProgress(@ConnectedSocket() client: Socket): Promise<IWsResponse<number>> {
    try {
      const rideId = client.handshake.query.rideId?.toString();
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      const progress = await this.rideService.getRideProgress(rideId);

      return {
        code: 200,
        data: progress,
      };
    } catch (error) {
      this.logger.error('Error in getRideProgress:', error);
      throw error;
    }
  }

  @SubscribeMessage('getRideDetails')
  async getRideDetails(
    @MessageBody() payload: { rideId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const rideId = payload?.rideId || client.handshake.query.rideId?.toString();
      
      if (!rideId) {
        throw new WsException('Ride ID is required');
      }

      const ride = await this.rideService.getRideById(rideId);
      if (!ride) {
        throw new WsException('Ride not found');
      }
      
      return { code: 200, data: ride };
    } catch (error) {
      this.logger.error('Error in getRideDetails:', error);
      throw error;
    }
  }
} 