import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  const config = new DocumentBuilder()
    .setTitle('JUCR POI Service API')
    .setDescription('API for importing and serving Charge Point POIs')
    .setVersion('1.0')
    .addTag('pois', 'Endpoints for reading POI data')
    .addTag('import', 'Endpoints for triggering data import')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}`);
  Logger.log(`Swagger UI available at: http://localhost:${port}/api`);
}
bootstrap();