import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockDb } from '../../test/utils/mock-db'; // ✅ import reusable mock
import { DBNotFoundException } from '../common/exceptions/not-found.exception';
import { DRIZZLE } from '../database/database.module';
import { organizations } from '../database/schemas/schema';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { FilterOrganizationDto } from './dto/filter-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
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
        OrganizationsService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
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
    it('should create an organization successfully', async () => {
      const dto: CreateOrganizationDto = {
        name: 'Test Org',
        email: 'test@example.com',
        phone: '1234567890',
        url: 'http://test.com',
        countryId: 1,
      };
      mockQueryBuilder._mockResult = [{ id: 1 }];

      const result = await service.create(dto);

      expect(db.insert).toHaveBeenCalledWith(organizations);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  // --------------------------------------------------------------------
  // UPDATE
 // --------------------------------------------------------------------
  describe('update', () => {
    it('should update an organization successfully', async () => {
      const dto: UpdateOrganizationDto = { name: 'Updated Org' };
      mockQueryBuilder._mockResult = [{ id: 1, name: 'Updated Org' }];

      const result = await service.update(1, dto);
      expect(result).toEqual({ id: 1, name: 'Updated Org' });
    });

    it('should throw DBNotFoundException if organization not found', async () => {
      mockQueryBuilder._mockResult = [];
      await expect(service.update(1, { name: 'None' })).rejects.toThrow(
        new DBNotFoundException('Organization', { id: 1 }),
      );
    });
  });

  // --------------------------------------------------------------------
  // FIND ONE
 // --------------------------------------------------------------------
  describe('findOne', () => {
    it('should return an organization', async () => {
      const expected = { id: 1, name: 'Org' };
      db.query.organizations.findFirst.mockResolvedValue(expected);

      const result = await service.findOne(1);

      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne(NaN as any)).rejects.toThrow(
        new BadRequestException('A valid organization ID is required'),
      );
    });

    it('should throw DBNotFoundException if not found', async () => {
      db.query.organizations.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(
        new DBNotFoundException('Organization', { id: 1 }),
      );
    });
  });

  // --------------------------------------------------------------------
  // REMOVE / RESTORE / DELETE
  // --------------------------------------------------------------------
  describe('remove', () => {
    it('should soft delete an organization', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'Org',
        deletedAt: null,
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.remove(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('restore', () => {
    it('should restore an organization', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'Org',
        deletedAt: new Date(),
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.restore(1);

      expect(service.findOne).toHaveBeenCalledWith(1, true);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('delete', () => {
    it('should permanently delete an organization', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        name: 'Org',
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
    it('should return paginated organizations', async () => {
      const dto: FilterOrganizationDto = {};
      const mockRows = [
        {
          organizationId: 1,
          organizationName: 'Test Org',
          organizationEmail: 'test@example.com',
          organizationPhone: '1234567890',
          organizationUrl: 'http://test.com',
          organizationCreatedAt: new Date(),
          organizationDeletedAt: null,
          contactName: 'John Doe',
          contactEmail: 'john@example.com',
          contactPhone: '0987654321',
          countryName: 'USA',
          countryIso: 'US',
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
      expect(result.data[0].name).toBe('Test Org');
    });
 });

  // --------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------
  describe('bulkCreate', () => {
    it('should throw BadRequestException if empty', async () => {
      await expect(service.bulkCreate([])).rejects.toThrow(
        new BadRequestException('No organizations provided for mass create'),
      );
    });

    it('should create multiple organizations', async () => {
      const dtos: CreateOrganizationDto[] = [
        {
          name: 'Org1',
          email: 'org1@example.com',
          phone: '1234567890',
          url: 'http://org1.com',
          countryId: 1,
        },
        {
          name: 'Org2',
          email: 'org2@example.com',
          phone: '0987654321',
          url: 'http://org2.com',
          countryId: 2,
        },
      ];
      const expected = [{ id: 1 }, { id: 2 }];
      (db.transaction as jest.Mock).mockResolvedValue(expected);

      const result = await service.bulkCreate(dtos);

      expect(result).toEqual({
        message: 'Successfully created 2 organizations',
        data: expected,
      });
    });
  });

  describe('bulkRemove', () => {
    it('should soft delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateOrganizations')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRemove([1, 2, 3]);

      expect(result).toEqual({
        message: 'Soft-deleted 3 organizations in batches',
        deletedIds: [1, 2, 3],
      });
    });
  });

  describe('bulkRestore', () => {
    it('should restore multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateOrganizations')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRestore([1, 2, 3]);

      expect(result).toEqual({
        message: 'Restored 3 organizations in batches',
        restoredIds: [1, 2, 3],
      });
    });
  });

  describe('bulkDelete', () => {
    it('should permanently delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateOrganizations')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkDelete([1, 2, 3]);

      expect(result).toEqual({
        message: 'Permanently deleted 3 organizations in batches.',
        deletedIds: [1, 2, 3],
      });
    });
  });

  // --------------------------------------------------------------------
  // VALIDATE
 // --------------------------------------------------------------------
  describe('validateOrganizations', () => {
    it('should validate IDs and return them', async () => {
      db.query.organizations.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await (service as any).validateOrganizations([1, 2]);
      expect(result).toEqual([1, 2]);
    });

    it('should throw BadRequestException if IDs array is empty', async () => {
      await expect((service as any).validateOrganizations([])).rejects.toThrow(
        new BadRequestException('IDs array is required'),
      );
    });

    it('should throw DBNotFoundException if no organizations found', async () => {
      db.query.organizations.findMany.mockResolvedValue([]);
      await expect((service as any).validateOrganizations([1, 2])).rejects.toThrow(
        DBNotFoundException,
      );
    });
  });
});
