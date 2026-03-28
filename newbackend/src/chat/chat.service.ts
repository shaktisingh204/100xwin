import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';

const MAX_MSG_LENGTH = 300;
const BANNED_WORDS: string[] = []; // add if needed

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(ChatMessage.name)
        private readonly chatMessageModel: Model<ChatMessageDocument>,
    ) { }

    /**
     * Save a new chat message. Validates & sanitises content.
     */
    async createMessage(data: {
        userId: number;
        username: string;
        content: string;
        level?: number;
        role?: string;
    }): Promise<ChatMessageDocument> {
        const cleaned = data.content.trim().slice(0, MAX_MSG_LENGTH);
        if (!cleaned) throw new Error('Empty message');

        const lower = cleaned.toLowerCase();
        for (const word of BANNED_WORDS) {
            if (lower.includes(word)) throw new Error('Message contains prohibited content');
        }

        const msg = new this.chatMessageModel({
            userId: data.userId,
            username: data.username,
            content: cleaned,
            level: data.level ?? 0,
            role: data.role ?? 'user',
        });
        return msg.save();
    }

    /**
     * Get last N non-deleted messages, oldest-first.
     */
    async getHistory(limit = 60): Promise<ChatMessageDocument[]> {
        return this.chatMessageModel
            .find({ deleted: false })
            .sort({ createdAt: -1 })
            .limit(Math.min(limit, 100))
            .lean()
            .exec()
            .then((msgs) => (msgs as any[]).reverse());
    }

    /**
     * Admin: soft-delete a message.
     */
    async deleteMessage(messageId: string): Promise<{ ok: boolean }> {
        const result = await this.chatMessageModel.findByIdAndUpdate(
            messageId,
            { deleted: true },
            { new: true },
        );
        if (!result) throw new NotFoundException('Message not found');
        return { ok: true };
    }

    /**
     * Admin: get all messages (including deleted) for a user.
     */
    async getMessagesByUser(userId: number, limit = 50): Promise<ChatMessageDocument[]> {
        return this.chatMessageModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .exec() as any;
    }
}
