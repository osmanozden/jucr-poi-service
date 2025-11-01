import { Process, Processor } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import type { Job } from 'bull';
import { Model } from 'mongoose';
import { Poi, PoiDocument } from '../schemas/poi.schema';
import { Logger } from '@nestjs/common';

@Processor('poi-import')
export class ImporterProcessor {
  private readonly logger = new Logger(ImporterProcessor.name);

  constructor(
    @InjectModel(Poi.name) private poiModel: Model<PoiDocument>,
  ) {}

  @Process()
  async handleImport(job: Job<any>) {
    const poiData = job.data;
    const ocmId = poiData.ID;

    this.logger.log(`Processing job ${job.id} for POI ID: ${ocmId}`);

    try {
      const poiToUpdate = {
        ocmId: ocmId,
        status: poiData.StatusType?.Title,
        dateLastStatusUpdate: poiData.DateLastStatusUpdate,
        
        address: {
          title: poiData.AddressInfo?.Title,
          addressLine1: poiData.AddressInfo?.AddressLine1,
          town: poiData.AddressInfo?.Town,
          stateOrProvince: poiData.AddressInfo?.StateOrProvince,
          postcode: poiData.AddressInfo?.Postcode,
          country: poiData.AddressInfo?.Country?.Title,
          latitude: poiData.AddressInfo?.Latitude,
          longitude: poiData.AddressInfo?.Longitude,
        },
        
        connections: (poiData.Connections || []).map((conn: any) => ({
          connectionType: conn.ConnectionType?.Title,
          powerKW: conn.PowerKW,
          currentType: conn.CurrentType?.Title,
          quantity: conn.Quantity,
        })),
      };

      const result = await this.poiModel.updateOne(
        { ocmId: ocmId },
        { $set: poiToUpdate },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        this.logger.log(`Job ${job.id} completed: POI ID ${ocmId} CREATED.`);
        return { status: 'created', ocmId: ocmId };
      } else if (result.modifiedCount > 0) {
        this.logger.log(`Job ${job.id} completed: POI ID ${ocmId} UPDATED.`);
        return { status: 'updated', ocmId: ocmId };
      } else {
        this.logger.log(`Job ${job.id} completed: POI ID ${ocmId} NO CHANGE.`);
        return { status: 'no_change', ocmId: ocmId };
      }

    } catch (error) {
      this.logger.error(`Job ${job.id} failed for POI ID: ${ocmId}`, error.stack);
      throw error;
    }
  }
}