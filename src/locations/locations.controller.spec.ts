import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { DRIZZLE } from '../database/database.module';

// Mock database instance
const mockDb = {
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  select: jest.fn(),
  from: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  query: {
    locations: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
  transaction: jest.fn(),
  values: jest.fn(),
  returning: jest.fn(),
  set: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string) => {
    switch (key) {
      case 'APP_PAGINATION_MAXIMUM_LIMIT':
        return 100;
      case 'APP_PAGINATION_MINIMUM_LIMIT':
        return 10;
      case 'APP_PAGINATION_OFFSET':
        return 0;
      case 'APP_TRANSACTIONS_BATCH_SIZE':
        return 1000;
      default:
        return null;
    }
  }),
};

describe('LocationsController', () => {
  let controller: LocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        LocationsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
