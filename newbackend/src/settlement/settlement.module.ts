import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';

import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';

import { Bet, BetSchema } from '../bets/schemas/bet.schema';
import { Event, EventSchema } from '../sports/schemas/event.schema';
import { Market, MarketSchema } from '../sports/schemas/market.schema';
import { Competition, CompetitionSchema } from '../sports/schemas/competition.schema';
import { SettledMarket, SettledMarketSchema } from './schemas/settled-market.schema';
import { RedisModule } from '../redis/redis.module';
import { MatchCashbackModule } from '../match-cashback/match-cashback.module';

@Module({
    imports: [
        HttpModule,
        RedisModule,
        MatchCashbackModule,
        MongooseModule.forFeature([
            { name: Bet.name, schema: BetSchema },
            { name: Event.name, schema: EventSchema },
            { name: Market.name, schema: MarketSchema },
            { name: Competition.name, schema: CompetitionSchema },
            { name: SettledMarket.name, schema: SettledMarketSchema },
        ])
    ],
    providers: [SettlementService],
    controllers: [SettlementController],
    exports: [SettlementService]
})
export class SettlementModule { }
