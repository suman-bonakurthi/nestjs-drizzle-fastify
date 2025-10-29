import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockDb } from '../../test/utils/mock-db'; // ✅ import reusable mock
import { DBNotFoundException } from '../common/exceptions/not-found.exception';
import { DRIZZLE } from '../database/database.module';
import { locations } from '../database/schemas/schema';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { FilterLocationDto } from './dto/filter-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

describe('LocationsService', () => {
  let service: LocationsService;
  let db: any;
  let mockQueryBuilder: any;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map = {
        APP_PAGINATION_MAXIMUM_LIMIT: 10,
        APP_PAGINATION_MINIMUM_LIMIT: 10,
        APP_PAGINATION_OFFSET: 0,
        APP_TRANSACTIONS_BATCH_SIZE: 1000,
      };
      return map[key] ?? null;
    }),
  };

  beforeEach(async () => {
    const { db: mockDb, mockQueryBuilder: qb } = createMockDb([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);

    db = mockDb;
    mockQueryBuilder = qb;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------
  // BASIC DEFINITION
  // --------------------------------------------------------------------
  it('should be defined', () => {
    expect(service).toBeDefined();
 });

  // --------------------------------------------------------------------
  // CREATE
 // --------------------------------------------------------------------
  describe('create', () => {
    it('should create a location successfully', async () => {
      const dto: CreateLocationDto = { 
        address: '123 Main St', 
        title: 'Main Office', 
        postalCode: '12345',
        cityId: 1,
        isPrimary: true
      };
      mockQueryBuilder._mockResult = [{ id: 1 }];

      const result = await service.create(dto);

      expect(db.insert).toHaveBeenCalledWith(locations);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  // --------------------------------------------------------------------
  // UPDATE
 // --------------------------------------------------------------------
  describe('update', () => {
    it('should update a location successfully', async () => {
      const dto: UpdateLocationDto = { address: '456 Oak Ave' };
      mockQueryBuilder._mockResult = [{ id: 1, address: '456 Oak Ave' }];

      const result = await service.update(1, dto);
      expect(result).toEqual({ id: 1, address: '456 Oak Ave' });
    });

    it('should throw DBNotFoundException if location not found', async () => {
      mockQueryBuilder._mockResult = [];
      await expect(service.update(1, { address: 'None' })).rejects.toThrow(
        new DBNotFoundException('Location', { id: 1 }),
      );
    });
 });

  // --------------------------------------------------------------------
  // FIND ONE
  // --------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a location', async () => {
      const expected = { id: 1, address: '123 Main St' };
      db.query.locations.findFirst.mockResolvedValue(expected);

      const result = await service.findOne(1);
      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne(NaN as any)).rejects.toThrow(
        new BadRequestException('A valid Location ID is required'),
      );
    });

    it('should throw DBNotFoundException if not found', async () => {
      db.query.locations.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(
        new DBNotFoundException('Location', { id: 1 }),
      );
    });
 });

  // --------------------------------------------------------------------
  // REMOVE / RESTORE / DELETE
  // --------------------------------------------------------------------
  describe('remove', () => {
    it('should soft delete a location', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        address: '123 Main St',
        deletedAt: null,
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.remove(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('restore', () => {
    it('should restore a location', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        address: '123 Main St',
        deletedAt: new Date(),
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.restore(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('delete', () => {
    it('should permanently delete a location', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        address: '123 Main St',
        deletedAt: new Date(),
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.delete(1);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  // --------------------------------------------------------------------
  // FIND ALL
  // --------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated locations', async () => {
      const dto: FilterLocationDto = {};
      const mockRows = [
        {
          locationId: 1,
          locationAddress: '123 Main St',
          locationTitle: 'Main Office',
          locationPostalCode: '12345',
          cityName: 'New York',
          locationCreatedAt: new Date(),
          locationDeletedAt: null,
          total_count: 1,
        },
      ];

      // 🧠 Simulate what .then() or await returns
      (mockQueryBuilder.then as jest.Mock).mockImplementation((cb) =>
        cb(mockRows),
      );
      (mockQueryBuilder._mockResult as any) = mockRows;

      const result = await service.findAll(dto);

      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data[0].address).toBe('123 Main St');
    });
  });

  // --------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------
  describe('bulkRemove', () => {
    it('should soft delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateLocations')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRemove([1, 2, 3]);

      expect(result).toEqual({
        message: 'Soft-deleted 3 locations in batches',
        deletedIds: [1, 2, 3],
      });
    });
  });

  describe('bulkRestore', () => {
    it('should restore multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateLocations')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRestore([1, 2, 3]);

      expect(result).toEqual({
        message: 'Restored 3 locations in batches',
        restoredIds: [1, 2, 3],
      });
    });
  });

  describe('bulkDelete', () => {
    it('should permanently delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateLocations')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkDelete([1, 2, 3]);

      expect(result).toEqual({
        message: 'Permanently deleted 3 locations in batches.',
        deletedIds: [1, 2, 3],
      });
    });
  });

  // --------------------------------------------------------------------
  // VALIDATE
  // --------------------------------------------------------------------
  describe('validateLocations', () => {
    it('should validate IDs and return them', async () => {
      db.query.locations.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await (service as any).validateLocations([1, 2]);
      expect(result).toEqual([1, 2]);
    });

    it('should throw BadRequestException if IDs array is empty', async () => {
      await expect((service as any).validateLocations([])).rejects.toThrow(
        new BadRequestException('IDs array is required'),
      );
    });

    it('should throw DBNotFoundException if no locations found', async () => {
      db.query.locations.findMany.mockResolvedValue([]);
      await expect((service as any).validateLocations([1, 2])).rejects.toThrow(
        DBNotFoundException,
      );
    });
  });
});
