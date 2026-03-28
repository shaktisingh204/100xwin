import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OriginalsGateway } from './originals.gateway';
import { OriginalsAdminService } from './originals-admin.service';
import { OriginalsAdminController } from './originals-admin.controller';
import { OriginalsAccessController } from './originals-access.controller';
import { OriginalsPublicController } from './originals-public.controller';
import { GGRService } from './ggr.service';
import { MinesModule } from '../mines/mines.module';
import { DiceModule } from '../dice/dice.module';
import { EventsModule } from '../events.module';

// Schemas
import { MinesGame, MinesGameSchema } from './schemas/mines-game.schema';
import { OriginalsConfig, OriginalsConfigSchema } from './schemas/originals-config.schema';
import { OriginalsSession, OriginalsSessionSchema } from './schemas/originals-session.schema';
import { OriginalsGGRSnapshot, OriginalsGGRSnapshotSchema } from './schemas/originals-ggr-snapshot.schema';
import { OriginalsEngagementEvent, OriginalsEngagementEventSchema } from './schemas/originals-engagement-event.schema';
import { DiceGame, DiceGameSchema } from './schemas/dice-game.schema';

const MONGOOSE_FEATURES = MongooseModule.forFeature([
  { name: MinesGame.name,                schema: MinesGameSchema },
  { name: OriginalsConfig.name,          schema: OriginalsConfigSchema },
  { name: OriginalsSession.name,         schema: OriginalsSessionSchema },
  { name: OriginalsGGRSnapshot.name,     schema: OriginalsGGRSnapshotSchema },
  { name: OriginalsEngagementEvent.name, schema: OriginalsEngagementEventSchema },
  { name: DiceGame.name,                 schema: DiceGameSchema },
]);

@Module({
  imports: [
    MONGOOSE_FEATURES,
    forwardRef(() => MinesModule),
    forwardRef(() => DiceModule),
    forwardRef(() => EventsModule),
  ],
  controllers: [OriginalsAdminController, OriginalsAccessController, OriginalsPublicController],
  providers: [OriginalsGateway, OriginalsAdminService, GGRService],
  exports: [GGRService, OriginalsAdminService, MONGOOSE_FEATURES],
})
export class OriginalsModule {}
