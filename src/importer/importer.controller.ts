import { Controller, Get, Query, Logger, BadRequestException } from '@nestjs/common';
import { ImporterService } from './importer.service';

@Controller('import')
export class ImporterController {
  private readonly logger = new Logger(ImporterController.name);

  constructor(private readonly importerService: ImporterService) {}

  @Get()
  async triggerImport(@Query('countryCode') countryCode?: string) {
    this.logger.log(`Received import request.`);

    if (!countryCode) {
      this.logger.error('Country code is missing in the request.');
      // Throws a 400 Bad Request with a custom error message
      throw new BadRequestException('The countryCode query parameter is mandatory. You must provide a country code to proceed with the operation.');
    }

    this.logger.log(`Starting import for country: ${countryCode}`);

    const result = await this.importerService.importPoisByCountry(countryCode);

    return {
      message: `Import process started for ${countryCode}. See logs for details.`,
      data: result,
    };
  }
}