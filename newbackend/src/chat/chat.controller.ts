import {
    Controller, Get, Delete, Param, Query,
    Request, UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    /** Public — fetch last N messages for display */
    @Public()
    @Get('history')
    getHistory(@Query('limit') limit?: string) {
        const n = parseInt(limit || '60', 10) || 60;
        return this.chatService.getHistory(n);
    }

    /** Admin — soft-delete a message */
    @UseGuards(JwtAuthGuard)
    @Delete('message/:id')
    async deleteMessage(@Param('id') id: string, @Request() req: any) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'admin') {
            return { ok: false, message: 'Forbidden' };
        }
        return this.chatService.deleteMessage(id);
    }

    /** Admin — get messages by user ID */
    @UseGuards(JwtAuthGuard)
    @Get('user/:userId')
    async getByUser(
        @Param('userId') userId: string,
        @Request() req: any,
        @Query('limit') limit?: string,
    ) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'admin') {
            return { ok: false, message: 'Forbidden' };
        }
        return this.chatService.getMessagesByUser(parseInt(userId, 10), parseInt(limit || '50', 10) || 50);
    }
}
