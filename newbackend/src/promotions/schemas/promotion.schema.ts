import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromotionDocument = Promotion & Document;

@Schema({ timestamps: true })
export class Promotion {
    @Prop({ required: true })
    title: string;

    @Prop()
    subtitle: string;

    @Prop()
    description: string;

    @Prop()
    termsAndConditions: string;

    @Prop({ default: 'ALL', enum: ['ALL', 'CASINO', 'SPORTS', 'LIVE', 'VIP'] })
    category: string;

    @Prop()
    promoCode: string;

    @Prop({ default: 0 })
    minDeposit: number;

    @Prop({ default: 0 })
    bonusPercentage: number;

    @Prop()
    expiryDate: Date;

    @Prop({ default: 'CLAIM NOW' })
    buttonText: string;

    @Prop({ default: '/register' })
    buttonLink: string;

    @Prop()
    bgImage: string;

    @Prop()
    charImage: string;

    @Prop({ default: 'linear-gradient(135deg, #E37D32, #AE5910)' })
    gradient: string;

    @Prop()
    badgeLabel: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isFeatured: boolean;

    @Prop({ default: false })
    showInApp: boolean;

    @Prop({ default: 0 })
    order: number;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
