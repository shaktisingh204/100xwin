import { Global, Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { SportsModule } from './sports/sports.module';
import { ChatModule } from './chat/chat.module';

@Global()
@Module({
    imports: [forwardRef(() => SportsModule), ChatModule],
    providers: [EventsGateway],
    exports: [EventsGateway],
})
export class EventsModule { }
