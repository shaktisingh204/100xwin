import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './events.gateway';
import { EventsModule } from './events.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth.module';
import { SportsModule } from './sports/sports.module';
import { PrismaModule } from './prisma.module';
import { CasinoModule } from './casino/casino.module';
import { UsersModule } from './users/users.module';
import { BetsModule } from './bets/bets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RedisModule } from './redis/redis.module';
import { PromoCardModule } from './promo-card/promo-card.module';
import { UploadModule } from './upload/upload.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HomeCategoryModule } from './home-category.module';
import { ReferralModule } from './referral/referral.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BonusModule } from './bonus/bonus.module';
import { RiskModule } from './risk/risk.module';
import { FinanceModule } from './finance/finance.module';
import { CrmModule } from './crm/crm.module';
import { AgentModule } from './agents/agent.module';
import { SupportModule } from './support/support.module';
import { HealthModule } from './health/health.module';
import { PaymentModule } from './payment/payment.module';
import { Payment2Module } from './payment2/payment2.module';
import { Payment0Module } from './payment0/payment0.module';
import { VipModule } from './vip/vip.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SettlementModule } from './settlement/settlement.module';
import { NowpaymentsModule } from './nowpayments/nowpayments.module';
import { ChatModule } from './chat/chat.module';
import { ContactSettingsModule } from './contact-settings/contact-settings.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { WageringBackfillModule } from './wagering-backfill/wagering-backfill.module';
import { MinesModule } from './mines/mines.module';
import { OriginalsModule } from './originals/originals.module';
import { AviatorModule } from './aviator/aviator.module';
import { LimboModule } from './limbo/limbo.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { LivePulseModule } from './live-pulse/live-pulse.module';
import { ManualDepositModule } from './manual-deposit/manual-deposit.module';
import { PromoTeamModule } from './promo-team/promo-team.module';
import { MatchCashbackModule } from './match-cashback/match-cashback.module';



import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', 'uploads'), // Serve files from 'uploads' folder
        serveRoot: '/uploads', // Access via https://kuberexchange/api/uploads/filename.jpg
      },
      {
        rootPath: join(__dirname, '..', 'uploads'), // Serve files from 'uploads' folder
        serveRoot: '/api/uploads', // Access via https://kuberexchange/api/api/uploads/filename.jpg
      }
    ),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    AnalyticsModule,
    AuthModule,
    SportsModule,
    CasinoModule,
    UsersModule,
    EventsModule,
    BetsModule,
    TransactionsModule,
    RedisModule,
    PromoCardModule,
    UploadModule,
    HomeCategoryModule,
    ReferralModule,
    DashboardModule,
    BonusModule,
    RiskModule,
    FinanceModule,
    FinanceModule,
    CrmModule,
    AgentModule,
    SupportModule,
    HealthModule,
    PaymentModule,
    Payment2Module,
    Payment0Module,
    VipModule,
    PromotionsModule,
    AnnouncementsModule,
    SettlementModule,
    NowpaymentsModule,
    ChatModule,
    ContactSettingsModule,
    WageringBackfillModule,
    MinesModule,
    OriginalsModule,
    AviatorModule,
    LimboModule,
    NotificationsModule,
    PushNotificationsModule,
    LivePulseModule,
    ManualDepositModule,
    PromoTeamModule,
    MatchCashbackModule,
  ],


  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
