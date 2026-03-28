import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

import { RedisService } from './redis/redis.service';
import { SportsService } from './sports/sports.service';
import { ChatService } from './chat/chat.service';
import { Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Per-user rate limit: max messages per window
const CHAT_RATE_LIMIT = 5;          // messages
const CHAT_RATE_WINDOW_SECS = 10;   // per 10 seconds

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Redis sets / keys
  private readonly CHAT_ONLINE_KEY = 'global_chat_online';

  // In-memory map of socketId → verified JWT payload (avoids re-decoding every message)
  private socketUsers = new Map<string, { userId: number; username: string; role: string; level: number }>();

  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SportsService))
    private readonly sportsService: SportsService,
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) { }

  // ─── Connection Lifecycle ──────────────────────────────────────────

  handleConnection(client: Socket) {
    // Attempt to verify JWT from handshake auth or query token
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string) ||
      '';

    if (token) {
      try {
        const secret = this.configService.get<string>('JWT_SECRET') || 'secret';
        const payload: any = jwt.verify(token, secret);
        // JWT payload: { sub: userId, username, role }
        this.socketUsers.set(client.id, {
          userId: Number(payload.sub),
          username: payload.username || 'Guest',
          role: (payload.role || 'user').toLowerCase(),
          level: payload.level || 0,
        });
      } catch {
        // Token invalid — socket is anonymous, chat send will be blocked
      }
    }
  }

  async handleDisconnect(client: Socket) {
    this.socketUsers.delete(client.id);
    await this.cleanupClientSubscriptions(client.id);

    // Also remove from global-chat online set if they were in it
    const redis = this.redisService.getClient();
    const wasChatMember = await redis.srem(this.CHAT_ONLINE_KEY, client.id);
    if (wasChatMember) {
      const count = await redis.scard(this.CHAT_ONLINE_KEY);
      this.server.to('global-chat').emit('chat-online-count', { count });
    }
  }

  // ─── Match Subscription & Viewer Tracking ─────────────────────────

  @SubscribeMessage('join-match')
  async handleJoinMatch(client: Socket, matchId: string) {
    if (!matchId) return;
    const roomName = `match:${matchId}`;
    client.join(roomName);

    const now = Date.now();
    await this.redisService.getClient().zadd(`viewers:${matchId}`, now, client.id);
    await this.redisService.getClient().sadd(`socket_matches:${client.id}`, matchId);

    this.sportsService.ensureMarketImported(matchId).catch(err => {
      console.error(`Auto-import failed for ${matchId}:`, err.message);
    });

    return { status: 'success', joined: roomName };
  }

  @SubscribeMessage('match-heartbeat')
  async handleMatchHeartbeat(client: Socket, matchId: string) {
    if (!matchId) return;
    await this.redisService.getClient().zadd(`viewers:${matchId}`, Date.now(), client.id);
  }

  @SubscribeMessage('leave-match')
  async handleLeaveMatch(client: Socket, matchId: string) {
    if (!matchId) return;
    client.leave(`match:${matchId}`);

    await this.redisService.getClient().zrem(`viewers:${matchId}`, client.id);
    await this.redisService.getClient().srem(`socket_matches:${client.id}`, matchId);

    const count = await this.redisService.getClient().zcard(`viewers:${matchId}`);
    if (count === 0) {
      await this.redisService.getClient().set(`last_viewed:${matchId}`, Date.now());
    }
  }

  private async cleanupClientSubscriptions(socketId: string) {
    const redis = this.redisService.getClient();
    const matches = await redis.smembers(`socket_matches:${socketId}`);

    for (const matchId of matches) {
      await redis.zrem(`viewers:${matchId}`, socketId);
      const count = await redis.zcard(`viewers:${matchId}`);
      if (count === 0) {
        await redis.set(`last_viewed:${matchId}`, Date.now());
      }
    }
    await redis.del(`socket_matches:${socketId}`);
  }

  // ─── Generic Events ────────────────────────────────────────────────

  @SubscribeMessage('events')
  handleEvent(client: Socket, data: any): string {
    return data;
  }

  @SubscribeMessage('subscribeToUserRoom')
  handleUserRoomSubscription(
    client: Socket,
    payload?: { userId?: string | number } | string | number,
  ) {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) {
      return { status: 'error', message: 'Unauthorized' };
    }

    const requestedUserId =
      typeof payload === 'object' && payload !== null
        ? payload.userId
        : payload;
    const normalizedRequestedUserId =
      typeof requestedUserId === 'string' ? Number(requestedUserId) || requestedUserId : requestedUserId;

    if (normalizedRequestedUserId && normalizedRequestedUserId !== userInfo.userId) {
      return { status: 'error', message: 'Cannot subscribe to another user room' };
    }

    const roomName = `user:${userInfo.userId}`;
    client.join(roomName);
    return { status: 'success', room: roomName };
  }

  // ─── Global Chat ───────────────────────────────────────────────────

  @SubscribeMessage('join-global-chat')
  async handleJoinGlobalChat(client: Socket) {
    client.join('global-chat');
    const redis = this.redisService.getClient();
    await redis.sadd(this.CHAT_ONLINE_KEY, client.id);
    const count = await redis.scard(this.CHAT_ONLINE_KEY);
    this.server.to('global-chat').emit('chat-online-count', { count });
    return { status: 'success', count };
  }

  @SubscribeMessage('leave-global-chat')
  async handleLeaveGlobalChat(client: Socket) {
    client.leave('global-chat');
    const redis = this.redisService.getClient();
    await redis.srem(this.CHAT_ONLINE_KEY, client.id);
    const count = await redis.scard(this.CHAT_ONLINE_KEY);
    this.server.to('global-chat').emit('chat-online-count', { count });
  }

  @SubscribeMessage('send-chat-message')
  async handleChatMessage(client: Socket, payload: { content: string }) {
    // 1. Must be authenticated
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) {
      return { status: 'error', message: 'Unauthorized' };
    }

    // 2. Content check
    const content = (payload?.content || '').trim();
    if (!content) {
      return { status: 'error', message: 'Empty message' };
    }

    // 3. Per-user rate limit via Redis (sliding window)
    const rateLimitKey = `chat_rl:${userInfo.userId}`;
    const redis = this.redisService.getClient();
    const pipeline = redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, CHAT_RATE_WINDOW_SECS);
    const results = await pipeline.exec();
    const currentCount = (results?.[0]?.[1] as number) || 0;

    if (currentCount > CHAT_RATE_LIMIT) {
      return { status: 'error', message: `Slow down! Max ${CHAT_RATE_LIMIT} messages per ${CHAT_RATE_WINDOW_SECS}s.` };
    }

    // 4. Save to MongoDB
    try {
      const saved = await this.chatService.createMessage({
        userId: userInfo.userId,
        username: userInfo.username,
        content,
        level: userInfo.level,
        role: userInfo.role,
      });

      const msg = {
        id: (saved as any)._id.toString(),
        userId: saved.userId,
        username: saved.username,
        content: saved.content,
        level: saved.level,
        role: saved.role,
        createdAt: (saved as any).createdAt,
      };

      // 5. Broadcast to all members of global-chat room
      this.server.to('global-chat').emit('receive-chat-message', msg);
      return { status: 'success' };
    } catch (err: any) {
      const msg = err?.message || 'Failed to send';
      return { status: 'error', message: msg };
    }
  }

  // ─── Broadcast helpers ─────────────────────────────────────────────

  broadcastOddsUpdate(matchId: string, odds: any) {
    this.server.emit(`match:${matchId}:odds`, odds);
  }

  /** Broadcast live odds diffs to: (1) the specific match room, (2) global to update sports list */
  emitOddsUpdate(matchId: string, markets: any[]) {
    const payload = {
      messageType: 'odds',
      eventId: matchId,
      data: markets,
    };
    // Targeted — only clients watching this match
    this.server.to(`match:${matchId}`).emit('socket-data', payload);
    // Global — so SportsMainContent list updates too
    this.server.emit('socket-data', payload);
  }

  /** Broadcast a single market status change (suspended / active) */
  emitMarketStatus(matchId: string, marketId: string, ms: number) {
    const payload = { messageType: 'market_status', id: marketId, ms, eventId: matchId };
    this.server.to(`match:${matchId}`).emit('socket-data', payload);
    this.server.emit('socket-data', payload);
  }

  emitUserWalletUpdate(userId: string | number, payload: Record<string, any> = {}) {
    const normalizedUserId = typeof userId === 'string' ? Number(userId) || userId : userId;
    const data = { userId: normalizedUserId, ...payload };
    const roomName = `user:${normalizedUserId}`;

    this.server.to(roomName).emit('walletUpdate', data);
    this.server.to(roomName).emit('balanceUpdate', data);
  }

  emitBalanceUpdate(userId: string | number, newBalance: number) {
    this.emitUserWalletUpdate(userId, { balance: newBalance });
  }

  /** Broadcast a system message to global chat (e.g. admin deleted a message) */
  broadcastChatEvent(event: string, data: any) {
    this.server.to('global-chat').emit(event, data);
  }

  /** Broadcast live pulse data (jackpot, activities, online count) to all clients */
  emitLivePulse(data: { jackpotAmount: number; activities: any[]; onlineCount: number }) {
    this.server.emit('live-pulse', data);
  }
}
