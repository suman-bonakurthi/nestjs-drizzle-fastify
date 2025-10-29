import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockDb } from '../../test/utils/mock-db'; // ✅ import reusable mock
import { DBNotFoundException } from '../common/exceptions/not-found.exception';
import { DRIZZLE } from '../database/database.module';
import { contacts } from '../database/schemas/schema';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

describe('ContactsService', () => {
  let service: ContactsService;
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
        ContactsService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
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
    it('should create a contact successfully', async () => {
      const dto: CreateContactDto = {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        title: 'CEO',
        organizationId: 1,
      };
      mockQueryBuilder._mockResult = [{ id: 1 }];

      const result = await service.create(dto);

      expect(db.insert).toHaveBeenCalledWith(contacts);
      expect(result).toEqual([{ id: 1 }]);
    });
 });

  // --------------------------------------------------------------------
  // UPDATE
 // --------------------------------------------------------------------
  describe('update', () => {
    it('should update a contact successfully', async () => {
      const dto: UpdateContactDto = { fullName: 'John Doe Updated' };
      mockQueryBuilder._mockResult = [{ id: 1, fullName: 'John Doe Updated' }];

      const result = await service.update(1, dto);
      expect(result).toEqual({ id: 1, fullName: 'John Doe Updated' });
    });

    it('should throw DBNotFoundException if contact not found', async () => {
      mockQueryBuilder._mockResult = [];
      await expect(service.update(1, { fullName: 'None' })).rejects.toThrow(
        new DBNotFoundException('Contact', { id: 1 }),
      );
    });
 });

  // --------------------------------------------------------------------
  // FIND ONE
  // --------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a contact', async () => {
      const expected = { id: 1, fullName: 'John Doe' };
      db.query.contacts.findFirst.mockResolvedValue(expected);

      const result = await service.findOne(1);

      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne(NaN as any)).rejects.toThrow(
        new BadRequestException('A valid Contact ID is required'),
      );
    });

    it('should throw DBNotFoundException if not found', async () => {
      db.query.contacts.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(
        new DBNotFoundException('Contact', { id: 1 }),
      );
    });
  });

  // --------------------------------------------------------------------
  // REMOVE / RESTORE / DELETE
  // --------------------------------------------------------------------
  describe('remove', () => {
    it('should soft delete a contact', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        fullName: 'John Doe',
        deletedAt: null,
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.remove(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1 });
    });
 });

  describe('restore', () => {
    it('should restore a contact', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        fullName: 'John Doe',
        deletedAt: new Date(),
      } as any);

      mockQueryBuilder._mockResult = [{ id: 1 }];
      const result = await service.restore(1);

      expect(service.findOne).toHaveBeenCalledWith(1, true);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('delete', () => {
    it('should permanently delete a contact', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        fullName: 'John Doe',
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
    it('should return paginated contacts', async () => {
      const dto: FilterContactDto = {};
      const mockRows = [
        {
          contactId: 1,
          contactName: 'John Doe',
          contactTitle: 'CEO',
          contactPhone: '1234567890',
          contactEmail: 'john@example.com',
          organizationName: 'Test Org',
          organizationPhone: '0987654321',
          organizationEmail: 'test@example.com',
          contactCreatedAt: new Date(),
          contactDeletedAt: null,
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
      expect(result.data[0].fullName).toBe('John Doe');
    });
  });

  // --------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------
  describe('bulkCreate', () => {
    it('should throw BadRequestException if empty', async () => {
      await expect(service.bulkCreate([])).rejects.toThrow(
        new BadRequestException('No contacts provided for mass create'),
      );
    });

    it('should create multiple contacts', async () => {
      const dtos: CreateContactDto[] = [
        {
          fullName: 'Contact1',
          email: 'contact1@example.com',
          phone: '1234567890',
          organizationId: 1,
          title: 'Title1',
        },
        {
          fullName: 'Contact2',
          email: 'contact2@example.com',
          phone: '0987654321',
          organizationId: 2,
          title: 'Title2',
        },
      ];
      const expected = [{ id: 1 }, { id: 2 }];
      (db.transaction as jest.Mock).mockResolvedValue(expected);

      const result = await service.bulkCreate(dtos);

      expect(result).toEqual({
        message: 'Successfully created 2 contacts',
        data: expected,
      });
    });
  });

  describe('bulkRemove', () => {
    it('should soft delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateContacts')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRemove([1, 2, 3]);

      expect(result).toEqual({
        message: 'Soft-deleted 3 contacts in batches',
        deletedIds: [1, 2, 3],
      });
    });
  });

  describe('bulkRestore', () => {
    it('should restore multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateContacts')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkRestore([1, 2, 3]);

      expect(result).toEqual({
        message: 'Restored 3 contacts in batches',
        restoredIds: [1, 2, 3],
      });
    });
  });

  describe('bulkDelete', () => {
    it('should permanently delete multiple', async () => {
      jest
        .spyOn<any, any>(service, 'validateContacts')
        .mockResolvedValue([1, 2, 3]);
      mockQueryBuilder._mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = await service.bulkDelete([1, 2, 3]);

      expect(result).toEqual({
        message: 'Permanently deleted 3 contacts in batches.',
        deletedIds: [1, 2, 3],
      });
    });
  });

  // --------------------------------------------------------------------
  // VALIDATE
  // --------------------------------------------------------------------
  describe('validateContacts', () => {
    it('should validate IDs and return them', async () => {
      db.query.contacts.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await (service as any).validateContacts([1, 2]);
      expect(result).toEqual([1, 2]);
    });

    it('should throw BadRequestException if IDs array is empty', async () => {
      await expect((service as any).validateContacts([])).rejects.toThrow(
        new BadRequestException('IDs array is required'),
      );
    });

    it('should throw DBNotFoundException if no contacts found', async () => {
      db.query.contacts.findMany.mockResolvedValue([]);
      await expect((service as any).validateContacts([1, 2])).rejects.toThrow(
        DBNotFoundException,
      );
    });
  });
});
