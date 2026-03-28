import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LimboBetDocument = LimboBet & Document;
export type LimboBetResult = 'WIN' | 'LOSE' | 'ACTIVE';

@Schema({ collection: 'limbo_bets', timestamps: true })
export class LimboBet {
  @Prop({ required: true }) userId: number;
  @Prop({ required: true }) betAmount: number;
  @Prop({ default: 0 }) targetMultiplier: number;   // 0 = manual mode
  @Prop({ required: true }) resultMultiplier: number; // crash point / random result
  @Prop({ required: true }) result: LimboBetResult;
  @Prop({ default: 0 }) payout: number;
  @Prop({ default: 0 }) cashedOutAt: number;  // what multiplier user cashed out at (manual)
  @Prop({ default: 'fiat' }) walletType: string;
  @Prop({ default: 'INR' }) currency: string;
  @Prop({ required: true }) serverSeed: string;
  @Prop({ required: true }) serverSeedHash: string;
  @Prop({ required: true }) nonce: number;
}

export const LimboBetSchema = SchemaFactory.createForClass(LimboBet);
LimboBetSchema.index({ userId: 1, createdAt: -1 });
LimboBetSchema.index({ userId: 1, result: 1 });
