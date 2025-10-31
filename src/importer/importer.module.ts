import { Module } from '@nestjs/common';
import { ImporterService } from './importer.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ImporterProcessor } from './importer.processor';
import { ImporterController } from './importer.controller';
import { PoiModule } from '../poi/poi.module'; 

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'poi-import',
    }),
    PoiModule,
  ],
  providers: [
    ImporterService, 
    ImporterProcessor, 
  ],
  controllers: [
    ImporterController, 
  ],
})
export class ImporterModule {}