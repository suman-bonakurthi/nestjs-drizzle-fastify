import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockDb } from '../../test/utils/mock-db'; // ✅ import reusable mock
import { DBNotFoundException } from '../common/exceptions/not-found.exception';
import { DRIZZLE } from '../database/database.module';
import { users } from '../database/schemas/schema';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
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
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ]);

    db = mockDb;
    mockQueryBuilder = qb;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
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
    it('should create a user successfully', async () => {
      const dto: CreateUserDto = { 
        userName: 'john_doe', 
        email: 'john@example.com', 
        password: 'password123' 
      };
      mockQueryBuilder._mockResult = [{ id: '1' }];

      const result = await service.create(dto);

      expect(db.insert).toHaveBeenCalledWith(users);
      expect(result).toEqual([{ id: '1' }]);
    });
  });

  // --------------------------------------------------------------------
  // UPDATE
 // --------------------------------------------------------------------
  describe('update', () => {
    it('should update a user successfully', async () => {
      const dto: UpdateUserDto = { userName: 'jane_doe' };
      mockQueryBuilder._mockResult = [{ id: '1', userName: 'jane_doe' }];

      const result = await service.update('1', dto);
      expect(result).toEqual({ id: '1', userName: 'jane_doe' });
    });

    it('should throw DBNotFoundException if user not found', async () => {
      mockQueryBuilder._mockResult = [];
      await expect(service.update('1', { userName: 'none' })).rejects.toThrow(
        new DBNotFoundException('User', { id: '1' }),
      );
    });
  });

  // --------------------------------------------------------------------
  // FIND ONE
  // --------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a user', async () => {
      const expected = { id: '1', userName: 'john_doe' };
      db.query.users.findFirst.mockResolvedValue(expected);

      const result = await service.findOne('1');
      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne(null as any)).rejects.toThrow(
        new BadRequestException('A valid User ID is required'),
      );
    });

    it('should throw DBNotFoundException if not found', async () => {
      db.query.users.findFirst.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(
        new DBNotFoundException('User', { id: '1' }),
      );
    });
  });

  // --------------------------------------------------------------------
  // REMOVE / RESTORE / DELETE
 // --------------------------------------------------------------------
  describe('remove', () => {
    it('should soft delete a user', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: '1',
        userName: 'john_doe',
        deletedAt: null,
      } as any);

      mockQueryBuilder._mockResult = [{ id: '1' }];
      const result = await service.remove('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('restore', () => {
    it('should restore a user', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: '1',
        userName: 'john_doe',
        deletedAt: new Date(),
      } as any);

      mockQueryBuilder._mockResult = [{ id: '1' }];
      const result = await service.restore('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('delete', () => {
    it('should permanently delete a user', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: '1',
        userName: 'john_doe',
        deletedAt: new Date(),
      } as any);

      mockQueryBuilder._mockResult = [{ id: '1' }];
      const result = await service.delete('1');
      expect(result).toEqual([{ id: '1' }]);
    });
  });

  // --------------------------------------------------------------------
  // FIND ALL
  // --------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated users', async () => {
      const dto: FilterUserDto = {};
      const mockRows = [
        {
          userId: '1',
          userName: 'john_doe',
          userEmail: 'john@example.com',
          userPassword: 'password123',
          userCreatedAt: new Date(),
          userDeletedAt: null,
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
      expect(result.data[0].userName).toBe('john_doe');
    });
  });

  // --------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------
  describe('bulkRemove', () => {
    it('should soft delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateUsers')
        .mockResolvedValue(['1', '2', '3']);
      mockQueryBuilder._mockResult = [{ id: '1' }, { id: '2' }, { id: '3' }];

      const result = await service.bulkRemove(['1', '2', '3']);

      expect(result).toEqual({
        message: 'Soft-deleted 3 users in batches',
        deletedIds: ['1', '2', '3'],
      });
    });
  });

  describe('bulkRestore', () => {
    it('should restore multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateUsers')
        .mockResolvedValue(['1', '2', '3']);
      mockQueryBuilder._mockResult = [{ id: '1' }, { id: '2' }, { id: '3' }];

      const result = await service.bulkRestore(['1', '2', '3']);

      expect(result).toEqual({
        message: 'Restored 3 users in batches',
        restoredIds: ['1', '2', '3'],
      });
    });
  });

  describe('bulkDelete', () => {
    it('should permanently delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateUsers')
        .mockResolvedValue(['1', '2', '3']);
      mockQueryBuilder._mockResult = [{ id: '1' }, { id: '2' }, { id: '3' }];

      const result = await service.bulkDelete(['1', '2', '3']);

      expect(result).toEqual({
        message: 'Permanently deleted 3 users in batches.',
        deletedIds: ['1', '2', '3'],
      });
    });
  });

  // --------------------------------------------------------------------
  // VALIDATE
  // --------------------------------------------------------------------
  describe('validateUsers', () => {
    it('should validate IDs and return them', async () => {
      db.query.users.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const result = await (service as any).validateUsers(['1', '2']);
      expect(result).toEqual(['1', '2']);
    });

    it('should throw BadRequestException if IDs array is empty', async () => {
      await expect((service as any).validateUsers([])).rejects.toThrow(
        new BadRequestException('IDs array is required'),
      );
    });

    it('should throw DBNotFoundException if no users found', async () => {
      db.query.users.findMany.mockResolvedValue([]);
      await expect((service as any).validateUsers(['1', '2'])).rejects.toThrow(
        DBNotFoundException,
      );
    });
  });
});
