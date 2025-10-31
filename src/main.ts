import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();