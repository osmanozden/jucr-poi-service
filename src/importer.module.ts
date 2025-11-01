import { Module } from '@nestjs/common';
import { ImporterService } from './service/importer.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ImporterProcessor } from './job/importer.processor';
import { MongooseModule } from '@nestjs/mongoose';
import { Poi, PoiSchema } from './schemas/poi.schema';
import { ImporterController } from './controller/importer.controller';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'poi-import',
    }),
    MongooseModule.forFeature([{ name: Poi.name, schema: PoiSchema }]),
  ],
  providers: [ImporterService, ImporterProcessor],
  controllers: [ImporterController],
})
export class ImporterModule {}