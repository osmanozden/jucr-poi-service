import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class ImporterService {
  private readonly logger = new Logger(ImporterService.name);
  private readonly ocmApiUrl: string;
  private readonly ocmApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectQueue('poi-import') private readonly poiImportQueue: Queue,
  ) {
    this.ocmApiUrl = this.configService.getOrThrow<string>('OCM_API_URL');
    this.ocmApiKey = this.configService.getOrThrow<string>('OCM_API_KEY');
  }

  private async fetchPoisByCountry(countryCode: string): Promise<any[]> {
    this.logger.log(`Fetching POIs for country: ${countryCode}...`);
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.ocmApiUrl, {
          params: {
            key: this.ocmApiKey,
            countrycode: countryCode,
            maxresults: 50000,
            compact: true,
          },
          headers: {
            'User-Agent': 'JUCR-Technical-Challenge-Importer/1.0',
          },
          timeout: 30000,
        }),
      );

      if (response.data && Array.isArray(response.data)) {
        this.logger.log(
          `Successfully fetched ${response.data.length} POIs for ${countryCode}.`,
        );
        return response.data;
      }
      this.logger.warn(`No data returned for country: ${countryCode}`);
      return [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch POIs for ${countryCode}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to process country ${countryCode}`);
    }
  }

  private async addPoiToQueue(poiData: any) {
    try {
      const job = await this.poiImportQueue.add(poiData, {
        attempts: 3,
        removeOnComplete: true,
      });
      this.logger.log(`Job ${job.id} added to queue for POI ID: ${poiData.ID}`);
    } catch (error) {
      this.logger.error(`Failed to add POI ID ${poiData.ID} to queue`, error.stack);
    }
  }

  public async importPoisByCountry(countryCode: string) {
    this.logger.log(`Starting full import process for ${countryCode}...`);
    
    const poisToImport = await this.fetchPoisByCountry(countryCode);

    if (!poisToImport || poisToImport.length === 0) {
      this.logger.warn(`No POIs found for ${countryCode}. Nothing to queue.`);
      return { status: 'no_data', queued: 0 };
    }

    this.logger.log(`Queueing ${poisToImport.length} POIs for processing...`);
    for (const poi of poisToImport) {
      await this.addPoiToQueue(poi);
    }

    this.logger.log(`All ${poisToImport.length} POIs for ${countryCode} have been added to the queue.`);
    return { status: 'success', queued: poisToImport.length };
  }
}