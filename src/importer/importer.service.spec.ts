import { Test, TestingModule } from '@nestjs/testing';
import { ImporterService } from './importer.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { of } from 'rxjs';
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
    it('should fetch POIs and add them to the queue', async () => {
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
      expect(queueMock.add).toHaveBeenCalledWith(mockPoiData[0], expect.any(Object));
      expect(queueMock.add).toHaveBeenCalledWith(mockPoiData[1], expect.any(Object));

      expect(result.status).toBe('success');
      expect(result.queued).toBe(mockPoiData.length);
    });

    it('should return no_data if API returns empty array', async () => {
      const mockAxiosResponse = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse;

      jest
        .spyOn(httpService, 'get')
        .mockImplementation(() => of(mockAxiosResponse));

      const result = await service.importPoisByCountry('DE');

      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(queueMock.add).not.toHaveBeenCalled();
      expect(result.status).toBe('no_data');
      expect(result.queued).toBe(0);
    });
  });
});