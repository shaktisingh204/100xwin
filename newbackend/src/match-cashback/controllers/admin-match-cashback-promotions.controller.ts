import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SecurityTokenGuard } from '../../auth/security-token.guard';
import { CreateMatchCashbackPromotionDto } from '../dto/create-match-cashback-promotion.dto';
import { SetPromotionTriggerDto } from '../dto/set-promotion-trigger.dto';
import { UpdateMatchCashbackPromotionDto } from '../dto/update-match-cashback-promotion.dto';
import { MatchCashbackPromotionsService } from '../services/match-cashback-promotions.service';

@Controller('admin/promotions')
@UseGuards(SecurityTokenGuard)
export class AdminMatchCashbackPromotionsController {
    constructor(private readonly promotionsService: MatchCashbackPromotionsService) { }

    @Post()
    async create(@Body() dto: CreateMatchCashbackPromotionDto) {
        return this.promotionsService.create(dto);
    }

    @Get()
    async findAll() {
        return this.promotionsService.findAll();
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateMatchCashbackPromotionDto) {
        return this.promotionsService.update(id, dto);
    }

    @Post(':id/toggle')
    async toggle(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.promotionsService.toggle(id, body.isActive);
    }

    @Post(':id/trigger-condition')
    async triggerCondition(@Param('id') id: string, @Body() dto: SetPromotionTriggerDto) {
        return this.promotionsService.setTriggerState(id, dto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.promotionsService.remove(id);
    }
}
