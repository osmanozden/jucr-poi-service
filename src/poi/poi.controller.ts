import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { PoiService } from './poi.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetPoisQueryDto } from './dto/get-pois-query.dto';

@ApiTags('pois')
@Controller('pois')
export class PoiController {
  constructor(private readonly poiService: PoiService) {}

  @Get()
  @ApiOperation({ summary: 'List all POIs with pagination' })
  async findAll(@Query() query: GetPoisQueryDto) {
    const { limit, skip } = query;
    return this.poiService.findAll(limit, skip);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get a single POI by its UUID' })
  @ApiParam({ name: 'id', description: 'The UUID of the POI', type: String })
  async findByUuid(@Param('id') id: string) {
    const poi = await this.poiService.findByUuid(id);
    if (!poi) {
      throw new NotFoundException(`POI with UUID ${id} not found`);
    }
    return poi;
  }

  @Get('ocm/:ocmId')
  @ApiOperation({ summary: 'Get a single POI by its OCM ID' })
  @ApiParam({ name: 'ocmId', description: 'The unique ID from OpenChargeMap', type: Number })
  async findByOcmId(@Param('ocmId') ocmId: number) {
    const poi = await this.poiService.findByOcmId(ocmId);
    if (!poi) {
      throw new NotFoundException(`POI with OCM ID ${ocmId} not found`);
    }
    return poi;
  }
}