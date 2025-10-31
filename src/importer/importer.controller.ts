import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ImporterService } from './importer.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('import')
@Controller('import')
export class ImporterController {
  private readonly logger = new Logger(ImporterController.name);

  constructor(private readonly importerService: ImporterService) {}

  @Get(':countryCode')
  @ApiOperation({ summary: 'Trigger import process for a country' })
  @ApiParam({ 
    name: 'countryCode', 
    description: '2-letter ISO country code (e.g., DE, NL, FR)', 
    type: String, 
    example: 'DE' 
  })
  async triggerImport(@Param('countryCode') countryCode: string) {
    this.logger.log(`Received import request for country: ${countryCode}`);
    const result = this.importerService.importPoisByCountry(countryCode);
    return {
      message: `Import process started for ${countryCode}. See logs for details.`,
      data: result,
    };
  }
}