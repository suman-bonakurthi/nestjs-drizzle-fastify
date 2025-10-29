import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockDb } from '../../test/utils/mock-db'; // ✅ import reusable mock
import { DBNotFoundException } from '../common/exceptions/not-found.exception';
import { DRIZZLE } from '../database/database.module';
import { currencies } from '../database/schemas/schema';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { FilterCurrencyDto } from './dto/filter-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

describe('CurrenciesService', () => {
  let service: CurrenciesService;
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
        CurrenciesService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);
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
    it('should create a currency successfully', async () => {
      const dto: CreateCurrencyDto = { 
        name: 'US Dollar', 
        code: 'USD', 
        symbol: '$' 
      };
      mockQueryBuilder._mockResult = [{ id: 1 }];

      const result = await service.create(dto);

      expect(db.insert).toHaveBeenCalledWith(currencies);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  // --------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------
  describe('update', () => {
    it('should update a currency successfully', async () => {
      const dto: UpdateCurrencyDto = { name: 'Euro' };
      mockQueryBuilder._mockResult = [{ id: 1, name: 'Euro' }];

      const result = await service.update(1, dto);
      expect(result).toEqual({ id: 1, name: 'Euro' });
    });

    it('should throw DBNotFoundException if currency not found', async () => {
      mockQueryBuilder._mockResult = [];
      await expect(service.update(1, { name: 'None' })).rejects.toThrow(
        new DBNotFoundException('Currency', { id: 1 }),
      );
    });
  });

  // --------------------------------------------------------------------
  // FIND ONE
  // --------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a currency', async () => {
      const expected = { id: 1, name: 'USD' };
      db.query.currencies.findFirst.mockResolvedValue(expected);

      const result = await service.findOne(1);
      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne(NaN as any)).rejects.toThrow(
        new BadRequestException('A valid Country ID is required'),
      );
    });

    it('should throw DBNotFoundException if not found', async () => {
      db.query.currencies.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(
        new DBNotFoundException('Currency', { id: 1 }),
      );
    });
  });

  // --------------------------------------------------------------------
  // REMOVE / RESTORE / DELETE
  // --------------------------------------------------------------------
  describe('remove', () => {
    it('should soft delete a currency', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'USD',
        deletedAt: null,
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.remove(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('restore', () => {
    it('should restore a currency', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'USD',
        deletedAt: new Date(),
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.restore(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('delete', () => {
    it('should permanently delete a currency', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'USD',
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
    it('should return paginated currencies', async () => {
      const dto: FilterCurrencyDto = {};
      const mockRows = [
        {
          currencyId: 1,
          currencyName: 'USD',
          currencyCode: 'USD',
          currencySymbol: '$',
          currencyCreatedAt: new Date(),
          currencyDeletedAt: null,
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
      expect(result.data[0].name).toBe('USD');
    });
  });

  // --------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------
  describe('bulkRemove', () => {
    it('should soft delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateCurrencies')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRemove([1, 2, 3]);

      expect(result).toEqual({
        message: 'Soft-deleted 3 currencies in batches',
        deletedIds: [1, 2, 3],
      });
    });
  });

  describe('bulkRestore', () => {
    it('should restore multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateCurrencies')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRestore([1, 2, 3]);

      expect(result).toEqual({
        message: 'Restored 3 currencies in batches',
        restoredIds: [1, 2, 3],
      });
    });
  });

  describe('bulkDelete', () => {
    it('should permanently delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateCurrencies')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkDelete([1, 2, 3]);

      expect(result).toEqual({
        message: 'Permanently deleted 3 currencies in batches.',
        deletedIds: [1, 2, 3],
      });
    });
  });

  // --------------------------------------------------------------------
  // VALIDATE
  // --------------------------------------------------------------------
  describe('validateCurrencies', () => {
    it('should validate IDs and return them', async () => {
      db.query.currencies.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await (service as any).validateCurrencies([1, 2]);
      expect(result).toEqual([1, 2]);
    });

    it('should throw BadRequestException if IDs array is empty', async () => {
      await expect((service as any).validateCurrencies([])).rejects.toThrow(
        new BadRequestException('IDs array is required'),
      );
    });

    it('should throw DBNotFoundException if no currencies found', async () => {
      db.query.currencies.findMany.mockResolvedValue([]);
      await expect((service as any).validateCurrencies([1, 2])).rejects.toThrow(
        DBNotFoundException,
      );
    });
  });
});
