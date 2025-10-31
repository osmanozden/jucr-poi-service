import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Poi, PoiSchema } from './schemas/poi.schema';
import { PoiController } from './poi.controller';
import { PoiService } from './poi.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Poi.name, schema: PoiSchema }]),
  ],
  controllers: [PoiController],
  providers: [PoiService],
  exports: [
    PoiService,
    MongooseModule, 
  ],
})
export class PoiModule {}