import { Test, TestingModule } from '@nestjs/testing';
import { ImporterProcessor } from './importer.processor';
import { getModelToken } from '@nestjs/mongoose';
import { Poi } from './schemas/poi.schema';
import { Job } from 'bull';

describe('ImporterProcessor', () => {
  let processor: ImporterProcessor;
  let poiModelMock: any;

  const mockJob = {
    id: 1,
    data: {
      ID: 12345,
      StatusType: { Title: 'Operational' },
      DateLastStatusUpdate: '2025-01-01T00:00:00Z',
      AddressInfo: {
        Title: 'Test Station',
        AddressLine1: '1 Test Street',
        Town: 'Testville',
        StateOrProvince: 'Testland',
        Postcode: '12345',
        Country: { Title: 'Test Country' },
        Latitude: 50.0,
        Longitude: 10.0,
      },
      Connections: [
        {
          ConnectionType: { Title: 'Type 2' },
          PowerKW: 22,
          CurrentType: { Title: 'AC (3-Phase)' },
          Quantity: 2,
        },
      ],
    },
  } as unknown as Job<any>;

  beforeEach(async () => {
    poiModelMock = {
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImporterProcessor,
        {
          provide: getModelToken(Poi.name),
          useValue: poiModelMock,
        },
      ],
    }).compile();

    processor = module.get<ImporterProcessor>(ImporterProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleImport', () => {
    it('should create a new POI if it does not exist (upsert)', async () => {
      poiModelMock.updateOne.mockResolvedValue({
        upsertedCount: 1,
        modifiedCount: 0,
      });

      const result = await processor.handleImport(mockJob);

      expect(poiModelMock.updateOne).toHaveBeenCalledWith(
        { ocmId: 12345 },
        {
          $set: {
            ocmId: 12345,
            status: 'Operational',
            dateLastStatusUpdate: '2025-01-01T00:00:00Z',
            address: {
              title: 'Test Station',
              addressLine1: '1 Test Street',
              town: 'Testville',
              stateOrProvince: 'Testland',
              postcode: '12345',
              country: 'Test Country',
              latitude: 50.0,
              longitude: 10.0,
            },
            connections: [
              {
                connectionType: 'Type 2',
                powerKW: 22,
                currentType: 'AC (3-Phase)',
                quantity: 2,
              },
            ],
          },
        },
        { upsert: true },
      );
      expect(result.status).toBe('created');
    });

    it('should update an existing POI if it exists', async () => {
      poiModelMock.updateOne.mockResolvedValue({
        upsertedCount: 0,
        modifiedCount: 1,
      });

      const result = await processor.handleImport(mockJob);
      expect(result.status).toBe('updated');
    });

    it('should do nothing if POI exists but has no change', async () => {
      poiModelMock.updateOne.mockResolvedValue({
        upsertedCount: 0,
        modifiedCount: 0,
      });

      const result = await processor.handleImport(mockJob);
      expect(result.status).toBe('no_change');
    });

    it('should throw an error if database operation fails', async () => {
      const dbError = new Error('Database connection failed');
      poiModelMock.updateOne.mockRejectedValue(dbError);

      await expect(processor.handleImport(mockJob)).rejects.toThrow(dbError);
    });

    it('should throw an error if data is missing required ocmId (validation error)', async () => {
      const validationError = new Error('Validation failed: ocmId is required');
      poiModelMock.updateOne.mockRejectedValue(validationError);

      const jobWithoutId = {
        id: 2,
        data: {
          StatusType: { Title: 'Operational' },
        },
      } as unknown as Job<any>;

      await expect(processor.handleImport(jobWithoutId)).rejects.toThrow(
        validationError,
      );
    });

    it('should correctly map partially missing data (e.g., no connections)', async () => {
      poiModelMock.updateOne.mockResolvedValue({
        upsertedCount: 1,
        modifiedCount: 0,
      });

      const jobPartialData = {
        id: 3,
        data: {
          ID: 54321,
          AddressInfo: {
            Title: 'Partial Station',
          },
          Connections: null,
        },
      } as unknown as Job<any>;

      await processor.handleImport(jobPartialData);

      expect(poiModelMock.updateOne).toHaveBeenCalledWith(
        { ocmId: 54321 },
        {
          $set: {
            ocmId: 54321,
            status: undefined,
            dateLastStatusUpdate: undefined,
            address: {
              title: 'Partial Station',
              addressLine1: undefined,
              town: undefined,
              stateOrProvince: undefined,
              postcode: undefined,
              country: undefined,
              latitude: undefined,
              longitude: undefined,
            },
            connections: [],
          },
        },
        { upsert: true },
      );
    });
  });
});