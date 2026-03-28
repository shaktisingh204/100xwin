import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SupportService } from './support.service';
import { UseGuards } from '@nestjs/common';
// import { WsJwtAuthGuard } from '../auth/ws-jwt-auth.guard'; // Assuming we have one, or just standard check

@WebSocketGateway({ cors: { origin: '*' } })
export class SupportGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly supportService: SupportService) { }

    @SubscribeMessage('joinSupport')
    handleJoinSupport(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number }) {
        client.join(`support_user_${data.userId}`);
        return { event: 'joinedSupport', data: `Joined support_user_${data.userId}` };
    }

    @SubscribeMessage('adminJoinSupport')
    handleAdminJoinSupport(@ConnectedSocket() client: Socket) {
        client.join('support_admin'); // Admins join this room to see new tickets/messages? 
        // Or admin just subscribes to specific user rooms when they open chat.
        return { event: 'joinedAdminSupport', data: 'Joined support_admin' };
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: { ticketId: number, message: string, sender: 'USER' | 'ADMIN', userId?: number }) {
        // Save message
        const savedMessage = await this.supportService.addMessage(payload.ticketId, payload.message, payload.sender);

        // Broadcast to specific ticket room or user room
        // If sender is USER, notify ADMIN room and USER room
        // If sender is ADMIN, notify USER room

        // We need to know the User ID associated with the ticket to emit to `support_user_${userId}`
        const ticket = await this.supportService.getTicket(payload.ticketId);
        if (ticket) {
            this.server.to(`support_user_${ticket.userId}`).emit('newMessage', savedMessage);
            this.server.to('support_admin').emit('newMessage', { ...savedMessage, userId: ticket.userId });
        }

        return savedMessage;
    }
}
