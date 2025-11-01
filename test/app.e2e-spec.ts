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
  let importPoisSpy: jest.SpyInstance; 

  beforeEach(async () => {
    const moduleFixture: TestingModule = await NestTest.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    importerService = moduleFixture.get<ImporterService>(ImporterService);
    poiImportQueue = moduleFixture.get<Queue>(getQueueToken('poi-import'));
    
    importPoisSpy = jest.spyOn(importerService, 'importPoisByCountry');
  });

  afterEach(() => {
    importPoisSpy.mockClear();
    importPoisSpy.mockRestore(); 
  });

  afterAll(async () => {
    await poiImportQueue.close();
    await app.close();
  });

  it('/import (GET) should return 400 Bad Request if countryCode query parameter is missing', async () => {
    const expectedErrorMessage = 'The countryCode query parameter is mandatory. You must provide a country code to proceed with the operation.';

    await request(app.getHttpServer())
      .get(`/import`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toEqual(expectedErrorMessage);
        expect(res.body.error).toEqual('Bad Request');
      });
    
    expect(importPoisSpy).not.toHaveBeenCalled();
  });

  it('/import?countryCode={code} (GET) should trigger the import process (Happy Path)', async () => {
    const countryCode = 'DE';
    const mockImportResult = {
      status: 'success',
      queued: 123,
    };

    importPoisSpy.mockImplementation(async () => mockImportResult);

    const response = await request(app.getHttpServer())
      .get(`/import?countryCode=${countryCode}`)
      .expect(200);

    expect(importPoisSpy).toHaveBeenCalledWith(countryCode);
    expect(response.body.message).toContain(
      `Import process started for ${countryCode}`,
    );
    expect(response.body.data).toEqual(mockImportResult);
  });

  it('/import?countryCode={code} (GET) should return no_data status if service finds nothing', async () => {
    const countryCode = 'XX';
    const mockNoDataResult = {
      status: 'no_data',
      queued: 0,
    };

    importPoisSpy.mockImplementation(async () => mockNoDataResult);

    const response = await request(app.getHttpServer())
      .get(`/import?countryCode=${countryCode}`)
      .expect(200);

    expect(importPoisSpy).toHaveBeenCalledWith(countryCode);
    expect(response.body.data).toEqual(mockNoDataResult);
  });

  it('/import?countryCode={code} (GET) should return 500 if the service throws an error', async () => {
    const countryCode = 'ER';

    importPoisSpy.mockRejectedValue(new Error('Internal API Error'));

    const response = await request(app.getHttpServer())
      .get(`/import?countryCode=${countryCode}`)
      .expect(500);

    expect(importPoisSpy).toHaveBeenCalledWith(countryCode);
    expect(response.body.message).toEqual('Internal server error');
  });
});