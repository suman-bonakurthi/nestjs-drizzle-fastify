import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  SQL,
  sql,
} from 'drizzle-orm';
import { DBNotFoundException } from '../common/exceptions/not-found.exception';
import { DRIZZLE } from '../database/database.module';
import { contacts, organizations } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactsService {
  private readonly maxLimit: number;
  private readonly minLimit: number;
  private readonly defaultOffset: number;
  private readonly batchSize: number;
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDatabase,
    private readonly configService: ConfigService,
  ) {
    this.maxLimit =
      Number(this.configService.get('APP_PAGINATION_MAXIMUM_LIMIT')) || 100;
    this.minLimit =
      Number(this.configService.get('APP_PAGINATION_MINIMUM_LIMIT')) || 10;
    this.defaultOffset =
      Number(this.configService.get('APP_PAGINATION_OFFSET')) || 0;
    this.batchSize =
      Number(this.configService.get('APP_TRANSACTIONS_BATCH_SIZE')) || 1000;
  }

  async create(CreateContactDto: CreateContactDto) {
    return await this.db
      .insert(contacts)
      .values({ ...CreateContactDto, updatedAt: new Date() })
      .returning({ id: contacts.id });
  }

  async update(id: number, updateContactDto: UpdateContactDto) {
    const result = await this.db
      .update(contacts)
      .set({ ...updateContactDto, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();

    if (result.length === 0) {
      throw new DBNotFoundException('Contact', { id });
    }

    return result[0];
  }

  async findOne(id: number, deleted = false) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('A valid Contact ID is required');
    }

    const whereClause = deleted
      ? and(eq(contacts.id, id), isNotNull(contacts.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(contacts.id, id), isNull(contacts.deletedAt));

    const result = await this.db.query.contacts.findFirst({
      columns: {
        id: true,
        fullName: true,
        title: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('Contact', { id });

    return result;
  }

  async remove(id: number) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(contacts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(contacts)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(contacts)
      .where(eq(contacts.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(filterContactDto: FilterContactDto, deleted: boolean = false) {
    const {
      fullName,
      email,
      phone,
      title,
      organizationName,
      organizationEmail,
      organizationPhone,
      createdAt,
      sortBy = 'name',
      order = 'asc',
    } = filterContactDto;

    // ---- Pagination Config ----

    const limit = Math.min(
      filterContactDto.limit ?? this.minLimit,
      this.maxLimit,
    );
    const offset = filterContactDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: contacts.id,
      fullName: contacts.fullName,
      phone: contacts.phone,
      title: contacts.title,
      organizationName: organizations.name,
      organizationPhone: organizations.phone,
      organizationEmail: organizations.email,
      createdAt: contacts.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? contacts.fullName;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted ? isNotNull(contacts.deletedAt) : isNull(contacts.deletedAt),
      ...(fullName ? [ilike(contacts.fullName, `%${fullName}%`)] : []),
      ...(email ? [ilike(contacts.email, `%${email}%`)] : []),
      ...(phone ? [ilike(contacts.phone, `%${phone}%`)] : []),
      ...(title ? [ilike(contacts.title, `%${title}%`)] : []),
      ...(organizationName
        ? [ilike(organizations.name, `%${organizationName}%`)]
        : []),
      ...(organizationEmail
        ? [ilike(organizations.email, `%${organizationEmail}%`)]
        : []),
      ...(organizationPhone
        ? [ilike(organizations.phone, `%${organizationPhone}%`)]
        : []),

      ...(createdAt ? [lte(contacts.createdAt, new Date(createdAt))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        contactId: contacts.id,
        contactName: contacts.fullName,
        contactTitle: contacts.title,
        contactPhone: contacts.phone,
        contactEmail: contacts.email,

        organizationName: organizations.name,
        organizationPhone: organizations.phone,
        organizationEmail: organizations.email,

        contactCreatedAt: contacts.createdAt,
        contactDeletedAt: contacts.deletedAt,
        total_count: sql<number>`COUNT(*) OVER()`, // Ã¢Å“â€¦ Window function in Drizzle
      })
      .from(contacts)
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.contactId,
        fullName: r.contactName,
        title: r.contactTitle,
        phone: r.contactPhone,
        email: r.contactEmail,

        organizationName: r.organizationName,
        organizationEmail: r.organizationEmail,
        organizationPhone: r.organizationPhone,

        createdAt: r.contactCreatedAt,
        deletedAt: r.contactDeletedAt,
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createContactDto: CreateContactDto[]) {
    if (!createContactDto?.length) {
      throw new BadRequestException('No contacts provided for mass create');
    }

    const payloads = createContactDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // Ã°Å¸Â§  TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: Contact[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx
          .insert(contacts)
          .values(chunk)
          .returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} contacts`,
      data: inserted,
    };
  }

  async bulkRemove(ids: number[]) {
    const numericIds = await this.validateContacts(ids);
    if (!numericIds.length) {
      return { message: 'No valid contact IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(contacts)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(contacts.id, chunk))
          .returning({ id: contacts.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} contacts in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: number[]) {
    const numericIds = await this.validateContacts(ids, true);
    if (!numericIds.length) {
      return { message: 'No valid contact IDs found.', restoredIds: [] };
    }

    const restoredIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(contacts)
          .set({
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(inArray(contacts.id, chunk))
          .returning({ id: contacts.id });

        restoredIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Restored ${restoredIds.length} contacts in batches`,
      restoredIds,
    };
  }

  async bulkDelete(ids: number[]) {
    const numericIds = await this.validateContacts(ids, true); // validate regardless of soft-delete status
    if (!numericIds.length) {
      return { message: 'No valid contact IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        // Ã¢Å“â€¦ Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(contacts)
          .where(inArray(contacts.id, chunk))
          .returning({ id: contacts.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }
    });

    return {
      message: `Permanently deleted ${deletedIds.length} contacts in batches.`,
      deletedIds,
    };
  }

  private async validateContacts(
    ids: number[],
    deleted: boolean = false,
  ): Promise<number[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }

    const numericIds = ids.map(Number);

    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(contacts.id, numericIds)];

    // If softDelete=true Ã¢â€ â€™ include only records that are not deleted
    // If softDelete=false Ã¢â€ â€™ include all, even deleted ones
    conditions.push(
      deleted ? isNotNull(contacts.deletedAt) : isNull(contacts.deletedAt),
    );

    const existing = await this.db.query.contacts.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = numericIds.join(', ');
      throw new DBNotFoundException('Contact', { id: idList });
    }

    return numericIds;
  }
}
