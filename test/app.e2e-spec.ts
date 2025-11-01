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
    await new Promise(resolve => setTimeout(resolve, 500)); 
  });

  it('/import (GET) should return 400 Bad Request if countryCode query parameter is missing', async () => {
    const expectedErrorMessage = 'The countryCode query parameter is mandatory. You must provide a country code to proceed with the operation.';

    await request(app.getHttpServer())
      .get(`/import`)
      .expect(400)
      .expect((res) => {
        expect(Array.isArray(res.body.message)).toBe(true);
        expect(res.body.message).toContain(expectedErrorMessage);
        expect(res.body.error).toEqual('Bad Request');
      });
    
    expect(importPoisSpy).not.toHaveBeenCalled();
  });
  
  it('/import?countryCode=us (GET) should successfully transform and queue lowercase code', async () => {
    const lowercaseCode = 'us';
    const uppercaseCode = 'US';
    const mockQueueResult = { jobId: 3, queueName: 'poi-import' };

    importPoisSpy.mockImplementation(async () => mockQueueResult);

    const response = await request(app.getHttpServer())
      .get(`/import?countryCode=${lowercaseCode}`)
      .expect(202); 

    expect(importPoisSpy).toHaveBeenCalledWith(uppercaseCode); 
    expect(response.body.countryCode).toEqual(uppercaseCode); 
    expect(response.body.status).toEqual('queued');
  });

  it('/import?countryCode={code} (GET) should successfully queue the import process (Happy Path)', async () => {
    const countryCode = 'DE';
    const mockQueueResult = { jobId: 1, queueName: 'poi-import' };

    importPoisSpy.mockImplementation(async () => mockQueueResult);

    const response = await request(app.getHttpServer())
      .get(`/import?countryCode=${countryCode}`)
      .expect(202); 

    expect(importPoisSpy).toHaveBeenCalledWith(countryCode);
    expect(response.body.message).toContain(
      `Import job successfully queued for ${countryCode}`,
    );
    expect(response.body.status).toEqual('queued');
    expect(response.body.countryCode).toEqual(countryCode);
  });
  
  it('/import?countryCode=11 (GET) should return 400 Bad Request if code is numeric', async () => {
    const expectedErrorMessage = 'The countryCode must contain only alphabetic characters.';

    await request(app.getHttpServer())
      .get(`/import?countryCode=11`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain(expectedErrorMessage);
      });
    
    expect(importPoisSpy).not.toHaveBeenCalled();
  });

  it('/import?countryCode=USA (GET) should return 400 Bad Request if code length is incorrect', async () => {
    const expectedErrorMessage = 'The countryCode must be exactly 2 characters long, conforming to ISO 3166-1 alpha-2 standard.';

    await request(app.getHttpServer())
      .get(`/import?countryCode=USA`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain(expectedErrorMessage);
      });
    
    expect(importPoisSpy).not.toHaveBeenCalled();
  });

  it('/import?countryCode={code} (GET) should handle queuing success even if internal logic may vary', async () => {
    const countryCode = 'XX';
    const mockQueueResult = { jobId: 2, queueName: 'poi-import' };

    importPoisSpy.mockImplementation(async () => mockQueueResult);

    const response = await request(app.getHttpServer())
      .get(`/import?countryCode=${countryCode}`)
      .expect(202); 

    expect(importPoisSpy).toHaveBeenCalledWith(countryCode);
    expect(response.body.status).toEqual('queued');
    expect(response.body.countryCode).toEqual(countryCode);
  });

  it('/import?countryCode={code} (GET) should return 500 if the queueing service throws an error', async () => {
    const countryCode = 'ER';

    importPoisSpy.mockRejectedValue(new Error('Internal API Error'));

    await request(app.getHttpServer())
      .get(`/import?countryCode=${countryCode}`)
      .expect(500);

    expect(importPoisSpy).toHaveBeenCalledWith(countryCode);
  });
});