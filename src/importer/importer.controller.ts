import { Controller, Get, Query, Logger, HttpCode, ValidationPipe } from '@nestjs/common';
import { ImporterService } from './importer.service';
import { ImportQueryDto } from './model/import-query.dto';

@Controller('import')
export class ImporterController {
  private readonly logger = new Logger(ImporterController.name);

  constructor(private readonly importerService: ImporterService) {}

  @Get()
  @HttpCode(202) 
  async triggerImport(@Query(new ValidationPipe({ transform: true })) query: ImportQueryDto) {
    const { countryCode } = query;
    
    this.logger.log(`Received import request and queueing job for: ${countryCode}`);

    await this.importerService.importPoisByCountry(countryCode); 

    return {
      message: `Import job successfully queued for ${countryCode}. You will not be blocked; check logs/status endpoint for completion.`,
      status: 'queued',
      countryCode: countryCode,
    };
  }
}