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
import { contacts, countries, organizations } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { FilterOrganizationDto } from './dto/filter-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
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

  async create(createOrganizationDto: CreateOrganizationDto) {
    return await this.db
      .insert(organizations)
      .values({ ...createOrganizationDto, updatedAt: new Date() })
      .returning({ id: organizations.id });
  }

  async update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    const result = await this.db
      .update(organizations)
      .set({ ...updateOrganizationDto, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    if (result.length === 0) {
      throw new DBNotFoundException('Organization', { id });
    }

    return result[0];
  }

  async findOne(id: number, deleted = false) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('A valid organization ID is required');
    }

    const whereClause = deleted
      ? and(eq(organizations.id, id), isNotNull(organizations.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(organizations.id, id), isNull(organizations.deletedAt));

    const result = await this.db.query.organizations.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        url: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('Organization', { id });

    return result;
  }

  async remove(id: number) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(organizations)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(organizations)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(organizations)
      .where(eq(organizations.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(
    filterOrganizationDto: FilterOrganizationDto,
    deleted: boolean = false,
  ) {
    const {
      name,
      email,
      phone,
      sortBy = 'name',
      order = 'asc',
      countryName,
      contactName,
      contactEmail,
      contactPhone,
      created,
    } = filterOrganizationDto;

    // ---- Pagination Config ----

    const limit = Math.min(
      filterOrganizationDto.limit ?? this.minLimit,
      this.maxLimit,
    );
    const offset = filterOrganizationDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? organizations.name;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted
        ? isNotNull(organizations.deletedAt)
        : isNull(organizations.deletedAt),
      ...(name ? [ilike(organizations.name, `%${name}%`)] : []),
      ...(email ? [ilike(organizations.email, `%${email}%`)] : []),
      ...(phone ? [ilike(organizations.phone, `%${phone}%`)] : []),
      ...(countryName ? [ilike(countries.name, `%${countryName}%`)] : []),
      ...(contactName ? [ilike(contacts.fullName, `%${contactName}%`)] : []),
      ...(contactEmail ? [ilike(contacts.email, `%${contactEmail}%`)] : []),
      ...(contactPhone ? [ilike(contacts.phone, `%${contactPhone}%`)] : []),
      ...(created ? [lte(organizations.createdAt, new Date(created))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationEmail: organizations.email,
        organizationPhone: organizations.phone,
        organizationUrl: organizations.url,
        organizationCreatedAt: organizations.createdAt,
        organizationDeletedAt: organizations.deletedAt,
        contactName: contacts.fullName,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
        countryName: countries.name,
        countryIso: countries.iso,
        total_count: sql<number>`COUNT(*) OVER()`, // ✅ Window function in Drizzle
      })
      .from(organizations)
      .leftJoin(countries, eq(countries.id, organizations.countryId))
      .leftJoin(contacts, eq(contacts.organizationId, organizations.id))
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.organizationId,
        name: r.organizationName,
        email: r.organizationEmail,
        phone: r.organizationPhone,
        url: r.organizationUrl,
        createdAt: r.organizationCreatedAt,
        deletedAt: r.organizationDeletedAt,
        contact: {
          name: r.contactName,
          email: r.contactEmail,
          phone: r.contactPhone,
        },
        country: {
          name: r.countryName,
          iso: r.countryIso,
        },
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createOrganizationDto: CreateOrganizationDto[]) {
    if (!createOrganizationDto?.length) {
      throw new BadRequestException(
        'No organizations provided for mass create',
      );
    }

    const payloads = createOrganizationDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // 🧠 TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: Organization[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx
          .insert(organizations)
          .values(chunk)
          .returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} organizations`,
      data: inserted,
    };
  }

  async bulkRemove(ids: number[]) {
    const numericIds = await this.validateOrganizations(ids);
    if (!numericIds.length) {
      return { message: 'No valid organization IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(organizations)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(organizations.id, chunk))
          .returning({ id: organizations.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} organizations in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: number[]) {
    const numericIds = await this.validateOrganizations(ids, true);
    if (!numericIds.length) {
      return { message: 'No valid organization IDs found.', restoredIds: [] };
    }

    const restoredIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(organizations)
          .set({
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(inArray(organizations.id, chunk))
          .returning({ id: organizations.id });

        restoredIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Restored ${restoredIds.length} organizations in batches`,
      restoredIds,
    };
  }

  async bulkDelete(ids: number[]) {
    const numericIds = await this.validateOrganizations(ids, true); // validate regardless of soft-delete status
    if (!numericIds.length) {
      return { message: 'No valid organization IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        // ✅ Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(organizations)
          .where(inArray(organizations.id, chunk))
          .returning({ id: organizations.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }
    });

    return {
      message: `Permanently deleted ${deletedIds.length} organizations in batches.`,
      deletedIds,
    };
  }

  private async validateOrganizations(
    ids: number[],
    deleted: boolean = false,
  ): Promise<number[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }

    const numericIds = ids.map(Number);

    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(organizations.id, numericIds)];

    // If softDelete=true → include only records that are not deleted
    // If softDelete=false → include all, even deleted ones
    conditions.push(
      deleted
        ? isNotNull(organizations.deletedAt)
        : isNull(organizations.deletedAt),
    );

    const existing = await this.db.query.organizations.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = numericIds.join(', ');
      throw new DBNotFoundException('Organization', { id: idList });
    }

    return numericIds;
  }
}
