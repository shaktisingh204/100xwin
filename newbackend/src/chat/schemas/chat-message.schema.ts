import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
    @Prop({ required: true })
    userId: number; // Postgres user ID

    @Prop({ required: true })
    username: string;

    @Prop({ required: true })
    content: string;

    @Prop({ default: 0 })
    level: number;

    @Prop({ default: 'user', enum: ['user', 'mod', 'admin'] })
    role: string;

    @Prop({ default: false })
    deleted: boolean;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ createdAt: -1 });
ChatMessageSchema.index({ userId: 1 });
