import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:9827', 'http://127.0.0.1:9827', 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://zeero.bet', 'https://admin.zeero.bet', 'https://www.kuberexchange.com', 'https://admin.kuberexchange.com', 'http://localhost:3010', 'https://odd69.com', 'https://www.odd69.com'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 9828);
}
bootstrap();
