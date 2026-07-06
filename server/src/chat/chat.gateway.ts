import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SupportService } from '../support/support.service';
import { JwtService } from '@nestjs/jwt';

// Define the shape of incoming messages
interface IncomingMessage {
  content: string;
  receiverId?: number; // Optional. If missing, it's for general chat
}

@WebSocketGateway({
  cors: {
    origin: '*', // For development, allow all origins
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // We map socketIds to userIds here to track connected users
  private connectedUsers: Map<string, any> = new Map();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private supportService: SupportService,
  ) {}

  handleConnection(client: Socket) {
    try {
      // In a real app with strict auth, we would verify token here
      // const token = client.handshake.auth.token || client.handshake.headers.authorization;
      // For now, we wait for an explicit authenticate message
      console.log(`Client Connected: ${client.id}`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client Disconnected: ${client.id}`);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const decoded = this.jwtService.verify(data.token);
      const mappedUser = {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };

      this.connectedUsers.set(client.id, mappedUser);
      console.log(`User mapped to socket: ${mappedUser.userId}`);

      // Join the user to a private room based on their ID to receive DMs
      client.join(`user_${mappedUser.userId}`);

      // Also join a general chat room
      client.join('general_chat');

      // Admins join a support room to see incoming guest messages
      if (mappedUser.role === 'ADMIN' || mappedUser.role === 'MANAGER') {
        client.join('support_admin');
      }

      return { status: 'success' };
    } catch (e) {
      return { status: 'unauthorized', message: e.message };
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: IncomingMessage,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      return { status: 'error', message: 'Not authenticated' };
    }

    try {
      // 1. Save message to database
      const savedMessage = await this.chatService.saveMessage(
        user.userId,
        payload.content,
        payload.receiverId,
      );

      // 2. Broadcast the message
      if (payload.receiverId) {
        // Direct Message
        // Send to receiver
        this.server
          .to(`user_${payload.receiverId}`)
          .emit('newMessage', savedMessage);
        // Also send back to sender so their UI updates
        client.emit('newMessage', savedMessage);
      } else {
        // General Chat Message
        this.server.to('general_chat').emit('newMessage', savedMessage);
      }

      return { status: 'ok', data: savedMessage };
    } catch (error) {
      console.error('Error saving message:', error);
      return { status: 'error', message: 'Failed to send message' };
    }
  }

  // --- SUPPORT CHAT ENDPOINTS ---

  @SubscribeMessage('joinSupportTicket')
  handleJoinSupportTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: number },
  ) {
    client.join(`support_ticket_${data.ticketId}`);
    return { status: 'ok' };
  }

  @SubscribeMessage('sendSupportMessage')
  async handleSendSupportMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { ticketId: number; content: string; isFromAdmin: boolean },
  ) {
    try {
      // Check if admin
      let adminId: number | undefined;
      if (payload.isFromAdmin) {
        const user = this.connectedUsers.get(client.id);
        if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
          return { status: 'error', message: 'Unauthorized' };
        }
        adminId = user.userId;
      }

      const savedMessage = await this.supportService.saveMessage(
        payload.ticketId,
        payload.content,
        payload.isFromAdmin,
        adminId,
      );

      // Broadcast to the guest in their specific ticket room
      this.server
        .to(`support_ticket_${payload.ticketId}`)
        .emit('newSupportMessage', savedMessage);

      // Broadcast to all admins
      this.server.to('support_admin').emit('newSupportMessageAdmin', {
        ticketId: payload.ticketId,
        message: savedMessage,
      });

      return { status: 'ok', data: savedMessage };
    } catch (error) {
      console.error('Error saving support message:', error);
      return { status: 'error', message: 'Failed to send support message' };
    }
  }

  @SubscribeMessage('closeSupportTicketAdmin')
  handleCloseSupportTicketAdmin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: number },
  ) {
    // Broadcast to the guest that the session is closed
    this.server
      .to(`support_ticket_${payload.ticketId}`)
      .emit('supportTicketClosed', {
        ticketId: payload.ticketId,
      });
    return { status: 'ok' };
  }
}
