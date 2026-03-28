import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppNotification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(AppNotification.name)
        private readonly notifModel: Model<NotificationDocument>,
    ) {}

    async getForUser(userId: number) {
        return this.notifModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
    }

    async getUnreadCount(userId: number) {
        const count = await this.notifModel.countDocuments({ userId, isRead: false });
        return { count };
    }

    async markRead(id: string) {
        if (!id || !Types.ObjectId.isValid(id)) return { success: false };
        await this.notifModel.updateOne({ _id: id }, { $set: { isRead: true } });
        return { success: true };
    }

    async markAllRead(userId: number) {
        await this.notifModel.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
        return { success: true };
    }

    async create(data: { userId: number; title: string; body: string; deepLink?: string }) {
        return this.notifModel.create({ ...data, isRead: false });
    }
}
