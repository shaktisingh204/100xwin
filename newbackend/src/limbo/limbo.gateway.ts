import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { LimboService } from './limbo.service';
import { OriginalsAdminService } from '../originals/originals-admin.service';

interface AuthedSocket extends Socket {
  userId?: number;
  username?: string;
}

@WebSocketGateway({ namespace: '/limbo', cors: { origin: '*' } })
export class LimboGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(LimboGateway.name);
  private socketUsers = new Map<string, { userId: number; username: string }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly limboService: LimboService,
    private readonly originalsAdminService: OriginalsAdminService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string) || '';
    if (token) {
      try {
        const secret = this.configService.get<string>('JWT_SECRET') || 'secret';
        const payload: any = jwt.verify(token, secret);
        const userInfo = { userId: Number(payload.sub), username: payload.username || 'Player' };
        this.socketUsers.set(client.id, userInfo);
        client.userId = userInfo.userId;
        client.username = userInfo.username;
      } catch { /* anonymous */ }
    }
    const userInfo = this.socketUsers.get(client.id);
    if (userInfo) {
      const history = await this.limboService.getUserHistory(userInfo.userId, 30);
      client.emit('limbo:history', history);
    }
    client.emit('limbo:connected', { status: 'ok' });
  }

  handleDisconnect(client: AuthedSocket) {
    this.socketUsers.delete(client.id);
  }

  // ═══ AUTO MODE — instant result with target multiplier ═══════════════════

  @SubscribeMessage('limbo:play')
  async handlePlay(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { betAmount: number; targetMultiplier: number; walletType?: string },
  ) {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) { client.emit('limbo:error', { message: 'Unauthorized. Please log in.' }); return; }
    if (!(await this.originalsAdminService.canUserPlayOriginals(userInfo.userId))) {
      client.emit('limbo:error', { message: 'Zeero Originals access is not enabled for your account.' });
      return;
    }
    try {
      const result = await this.limboService.play(
        userInfo.userId, data.betAmount, data.targetMultiplier, data.walletType ?? 'fiat',
      );
      client.emit('limbo:result', result);
      this.server.emit('limbo:live-bet', {
        username: this.mask(userInfo.username), betAmount: data.betAmount,
        targetMultiplier: data.targetMultiplier, resultMultiplier: result.resultMultiplier,
        result: result.result, payout: result.payout,
      });
    } catch (err: any) {
      client.emit('limbo:error', { message: err?.message || 'Failed to play' });
    }
  }

  // ═══ MANUAL MODE — multiplier counts up, player cashes out ══════════════

  @SubscribeMessage('limbo:play-manual')
  async handlePlayManual(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { betAmount: number; walletType?: string },
  ) {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) { client.emit('limbo:error', { message: 'Unauthorized. Please log in.' }); return; }
    if (!(await this.originalsAdminService.canUserPlayOriginals(userInfo.userId))) {
      client.emit('limbo:error', { message: 'Zeero Originals access is not enabled for your account.' });
      return;
    }
    try {
      const result = await this.limboService.playManual(
        userInfo.userId, data.betAmount, data.walletType ?? 'fiat',
      );
      // Send crash point to client (only this player sees it)
      client.emit('limbo:manual-started', result);
    } catch (err: any) {
      client.emit('limbo:error', { message: err?.message || 'Failed to play' });
    }
  }

  @SubscribeMessage('limbo:cashout')
  async handleCashout(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { betId: string; cashoutAt: number },
  ) {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) { client.emit('limbo:error', { message: 'Unauthorized' }); return; }
    try {
      const result = await this.limboService.cashOutManual(
        userInfo.userId, data.betId, data.cashoutAt,
      );
      client.emit('limbo:cashout-success', result);
      // Broadcast
      this.server.emit('limbo:live-bet', {
        username: this.mask(userInfo.username), betAmount: result.betAmount,
        targetMultiplier: data.cashoutAt, resultMultiplier: data.cashoutAt,
        result: 'WIN', payout: result.payout,
      });
    } catch (err: any) {
      client.emit('limbo:error', { message: err?.message || 'Cashout failed' });
    }
  }

  @SubscribeMessage('limbo:bust')
  async handleBust(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { betId: string },
  ) {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) return;
    const bet = await this.limboService.bustManual(userInfo.userId, data.betId);
    if (!bet) return;
    // Broadcast loss
    this.server.emit('limbo:live-bet', {
      username: this.mask(userInfo.username), betAmount: bet.betAmount,
      targetMultiplier: bet.resultMultiplier, resultMultiplier: bet.resultMultiplier, result: 'LOSE', payout: 0,
    });
  }

  @SubscribeMessage('limbo:get-history')
  async handleGetHistory(@ConnectedSocket() client: AuthedSocket) {
    const userInfo = this.socketUsers.get(client.id);
    if (!userInfo) return;
    const history = await this.limboService.getUserHistory(userInfo.userId, 30);
    client.emit('limbo:history', history);
  }

  private mask(username: string): string {
    if (!username || username.length <= 3) return '***';
    return username.slice(0, 2) + '*'.repeat(username.length - 3) + username.slice(-1);
  }
}
