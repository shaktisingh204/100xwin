import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BonusService } from './bonus.service';
import { BonusController, BonusAdminController } from './bonus.controller';
import { Bonus, BonusSchema } from './schemas/bonus.schema';
import { PendingDepositBonus, PendingDepositBonusSchema } from './schemas/pending-deposit-bonus.schema';
import { EventsModule } from '../events.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Bonus.name, schema: BonusSchema },
            { name: PendingDepositBonus.name, schema: PendingDepositBonusSchema },
        ]),
        forwardRef(() => EventsModule),
    ],
    controllers: [BonusController, BonusAdminController],
    providers: [BonusService],
    exports: [BonusService],
})
export class BonusModule { }

