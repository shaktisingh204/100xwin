import { Module } from '@nestjs/common';
import { Payment2Service } from './payment2.service';
import { Payment2Controller } from './payment2.controller';
import { BonusModule } from '../bonus/bonus.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [BonusModule, UsersModule],
    providers: [Payment2Service],
    controllers: [Payment2Controller],
    exports: [Payment2Service],
})
export class Payment2Module { }
