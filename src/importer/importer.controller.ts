import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ImporterService } from './importer.service';

@Controller('import')
export class ImporterController {
  private readonly logger = new Logger(ImporterController.name);

  constructor(private readonly importerService: ImporterService) {}

  @Get(':countryCode')
  async triggerImport(@Param('countryCode') countryCode: string) {
    this.logger.log(`Received import request for country: ${countryCode}`);

    const result = await this.importerService.importPoisByCountry(countryCode);

    return {
      message: `Import process started for ${countryCode}. See logs for details.`,
      data: result,
    };
  }
}