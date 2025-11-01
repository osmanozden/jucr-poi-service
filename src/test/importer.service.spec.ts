import { Test, TestingModule } from '@nestjs/testing';
import { ImporterService } from '../service/importer.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('ImporterService', () => {
  let service: ImporterService;
  let httpService: HttpService;
  let queueMock: any;

  beforeEach(async () => {
    queueMock = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImporterService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key) => {
              if (key === 'OCM_API_URL') return 'http://fake-url.com';
              if (key === 'OCM_API_KEY') return 'fake-key';
              return null;
            }),
          },
        },
        {
          provide: getQueueToken('poi-import'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<ImporterService>(ImporterService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('importPoisByCountry', () => {
    const mockPoiData = [
      { ID: 1, AddressInfo: { Title: 'Test POI 1' } },
      { ID: 2, AddressInfo: { Title: 'Test POI 2' } },
    ];

    const mockAxiosResponse = {
      data: mockPoiData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as AxiosResponse;

    it('should fetch POIs and add them to the queue (Happy Path)', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of(mockAxiosResponse));

      queueMock.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.importPoisByCountry('DE');

      expect(httpService.get).toHaveBeenCalledWith(
        'http://fake-url.com',
        expect.any(Object),
      );

      expect(queueMock.add).toHaveBeenCalledTimes(mockPoiData.length);
      expect(queueMock.add).toHaveBeenCalledWith(
        mockPoiData[0],
        expect.any(Object),
      );
      expect(queueMock.add).toHaveBeenCalledWith(
        mockPoiData[1],
        expect.any(Object),
      );

      expect(result.status).toBe('success');
      expect(result.queued).toBe(mockPoiData.length);
    });

    it('should return no_data if API returns empty array', async () => {
      const mockEmptyResponse = {
        ...mockAxiosResponse,
        data: [],
      };

      jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of(mockEmptyResponse));

      const result = await service.importPoisByCountry('DE');

      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(queueMock.add).not.toHaveBeenCalled();
      expect(result.status).toBe('no_data');
      expect(result.queued).toBe(0);
    });

    it('should throw an error if HttpService fails', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockImplementation(() =>
          throwError(() => new Error('OCM API is down')),
        );

      await expect(service.importPoisByCountry('DE')).rejects.toThrow(
        'Failed to process country DE',
      );
      expect(queueMock.add).not.toHaveBeenCalled();
    });

    it('should continue queueing even if one job fails to add', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of(mockAxiosResponse));

      queueMock.add
        .mockRejectedValueOnce(new Error('Redis connection error'))
        .mockResolvedValueOnce({ id: 'job-2' });

      const result = await service.importPoisByCountry('DE');

      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(queueMock.add).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('success');
      expect(result.queued).toBe(mockPoiData.length);
    });
  });
});