import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettledMarketDocument = SettledMarket & Document;

@Schema({ timestamps: true })
export class SettledMarket {
    @Prop({ required: true, unique: true, index: true })
    externalMarketId: string; // The _id from the external API

    @Prop({ required: true, index: true })
    gmid: number; // Match/game ID from external API

    @Prop()
    marketName: string;

    @Prop()
    gtype: string; // MATCH or FANCY

    @Prop()
    winnerId: number;

    @Prop()
    settledBetCount: number;

    @Prop()
    settledAt: Date;
}

export const SettledMarketSchema = SchemaFactory.createForClass(SettledMarket);
