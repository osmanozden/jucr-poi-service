import { Test as NestTest, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ImporterService } from './../src/importer/importer.service';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('ImporterController (e2e)', () => {
  let app: INestApplication;
  let importerService: ImporterService;
  let poiImportQueue: Queue;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await NestTest.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    importerService = moduleFixture.get<ImporterService>(ImporterService);
    poiImportQueue = moduleFixture.get<Queue>(getQueueToken('poi-import'));
  });

  afterAll(async () => {
    await poiImportQueue.close();
    await app.close();
  });

  it('/import/{countryCode} (GET) should trigger the import process (Happy Path)', async () => {
    const countryCode = 'DE';
    const mockImportResult = {
      status: 'success',
      queued: 123,
    };

    jest
      .spyOn(importerService, 'importPoisByCountry')
      .mockImplementation(async () => mockImportResult);

    const response = await request(app.getHttpServer())
      .get(`/import/${countryCode}`)
      .expect(200);

    expect(importerService.importPoisByCountry).toHaveBeenCalledWith(
      countryCode,
    );
    expect(response.body.message).toContain(
      `Import process started for ${countryCode}`,
    );
    expect(response.body.data).toEqual(mockImportResult);
  });

  it('/import/{countryCode} (GET) should return no_data status if service finds nothing', async () => {
    const countryCode = 'XX';
    const mockNoDataResult = {
      status: 'no_data',
      queued: 0,
    };

    jest
      .spyOn(importerService, 'importPoisByCountry')
      .mockImplementation(async () => mockNoDataResult);

    const response = await request(app.getHttpServer())
      .get(`/import/${countryCode}`)
      .expect(200);

    expect(importerService.importPoisByCountry).toHaveBeenCalledWith(
      countryCode,
    );
    expect(response.body.data).toEqual(mockNoDataResult);
  });

  it('/import/{countryCode} (GET) should return 500 if the service throws an error', async () => {
    const countryCode = 'ER';

    jest
      .spyOn(importerService, 'importPoisByCountry')
      .mockRejectedValue(new Error('Internal API Error'));

    const response = await request(app.getHttpServer())
      .get(`/import/${countryCode}`)
      .expect(500);

    expect(importerService.importPoisByCountry).toHaveBeenCalledWith(
      countryCode,
    );
    expect(response.body.message).toEqual('Internal server error');
  });
});