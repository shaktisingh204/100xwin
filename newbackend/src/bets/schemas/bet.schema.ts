import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BetDocument = Bet & Document;

@Schema({ timestamps: true })
export class Bet {
  @Prop({ required: true, index: true }) // Using generic userId, no relation to User table in Mongo
  userId: number;

  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ index: true })
  matchId: string;

  @Prop()
  eventName: string;

  @Prop({ required: true })
  marketId: string;

  @Prop()
  marketName: string;

  @Prop({ required: true })
  selectionId: string;

  @Prop()
  selectionName: string;

  @Prop()
  selectedTeam: string;

  @Prop({ required: true })
  odds: number;

  @Prop({ required: true })
  stake: number;

  @Prop()
  originalStake: number; // immutable starting stake before any partial cash outs

  @Prop({ required: true })
  potentialWin: number;

  @Prop()
  originalPotentialWin: number; // immutable starting max return before any partial cash outs

  @Prop({ default: 'PENDING', index: true })
  status: string; // PENDING, WON, LOST, VOID, CASHED_OUT

  @Prop()
  settledReason: string; // Human-readable settlement explanation

  @Prop()
  settledAt: Date; // Timestamp when bet was settled

  @Prop({ default: 'back' })
  betType: string;

  @Prop({ default: 'fiat' })
  walletType: string; // 'fiat' | 'crypto' — wallet used to place the bet

  @Prop({ default: 'balance' })
  betSource: string; // 'balance' | 'sportsBonus' | 'casinoBonus' — which sub-wallet funded the stake

  @Prop({ default: 0 })
  bonusStakeAmount: number; // portion of the original stake funded from sports bonus

  @Prop({ default: 0 })
  walletStakeAmount: number; // portion of the original stake funded from the selected non-bonus wallet

  // ── Cash Out Fields ──────────────────────────────────────────────────────
  @Prop({ default: true })
  cashoutEnabled: boolean; // Admin/system can set to false to block cash out for this bet

  @Prop()
  cashoutValue: number; // Final amount settled when user cashed out

  @Prop({ default: 0 })
  partialCashoutValue: number; // cumulative value already realized from partial cash outs

  @Prop({ default: 0 })
  partialCashoutCount: number; // number of partial cash outs taken on this bet

  @Prop()
  cashedOutAt: Date; // Timestamp when user triggered cash out

  @Prop()
  lastPartialCashoutAt: Date; // Timestamp of the latest partial cash out
  // ────────────────────────────────────────────────────────────────────────

  // Optional: store full snapshot of market/odds at time of bet?
  @Prop({ type: MongooseSchema.Types.Mixed })
  snapshot: any;

  // ── Diamond API market details (used for result fetching) ─────────────────
  @Prop({ index: true })
  gtype: string; // e.g. 'match', 'fancy', 'session'

  @Prop()
  mname: string; // e.g. 'NORMAL', 'BHAV'

  @Prop()
  nat: string; // raw market nat string (e.g. '105 OVER RUN JK')

  @Prop()
  computedMarketName: string; // derived by getMarketNameFromGtype ('India vs Australia' or nat)
  // ──────────────────────────────────────────────────────────────────────────
}

export const BetSchema = SchemaFactory.createForClass(Bet);
BetSchema.index({ userId: 1, status: 1 });
