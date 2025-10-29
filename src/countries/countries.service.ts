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
import { countries, currencies } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateCountryDto } from './dto/create-country.dto';
import { FilterCountryDto } from './dto/filter-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { Country } from './entities/country.entity';

@Injectable()
export class CountriesService {
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

  async create(createCountryDto: CreateCountryDto) {
    return await this.db
      .insert(countries)
      .values({ ...createCountryDto, updatedAt: new Date() })
      .returning({ id: countries.id });
  }

  async update(id: number, updateCountryDto: UpdateCountryDto) {
    const result = await this.db
      .update(countries)
      .set({ ...updateCountryDto, updatedAt: new Date() })
      .where(eq(countries.id, id))
      .returning();

    if (result.length === 0) {
      throw new DBNotFoundException('Country', { id });
    }

    return result[0];
  }

  async findOne(id: number, deleted = false) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('A valid Country ID is required');
    }

    const whereClause = deleted
      ? and(eq(countries.id, id), isNotNull(countries.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(countries.id, id), isNull(countries.deletedAt));

    const result = await this.db.query.countries.findFirst({
      columns: {
        id: true,
        name: true,
        iso: true,
        flag: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('Country', { id });

    return result;
  }

  async remove(id: number) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(countries)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(countries.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(countries)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(countries.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(countries)
      .where(eq(countries.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(filterCountryDto: FilterCountryDto, deleted: boolean = false) {
    const {
      name,
      iso,
      createdAt,
      sortBy = 'name',
      order = 'asc',
    } = filterCountryDto;

    // ---- Pagination Config ----

    const limit = Math.min(
      filterCountryDto.limit ?? this.minLimit,
      this.maxLimit,
    );
    const offset = filterCountryDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: countries.id,
      name: countries.name,
      createdAt: countries.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? countries.name;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted ? isNotNull(countries.deletedAt) : isNull(countries.deletedAt),
      ...(name ? [ilike(countries.name, `%${name}%`)] : []),
      ...(iso ? [ilike(countries.iso, `%${iso}%`)] : []),
      ...(createdAt ? [lte(countries.createdAt, new Date(createdAt))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        countryId: countries.id,
        countryName: countries.name,
        countryIso: countries.iso,
        countryFlag: countries.flag,
        currencyName: currencies.name,
        countryCreatedAt: countries.createdAt,
        countryDeletedAt: countries.deletedAt,
        total_count: sql<number>`COUNT(*) OVER()`, // âœ… Window function in Drizzle
      })
      .from(countries)
      .leftJoin(currencies, eq(currencies.id, countries.currencyId))
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.countryId,
        name: r.countryName,
        iso: r.countryIso,
        flag: r.countryFlag,
        currency: r.currencyName,
        createdAt: r.countryCreatedAt,
        deletedAt: r.countryDeletedAt,
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createCountryDto: CreateCountryDto[]) {
    if (!createCountryDto?.length) {
      throw new BadRequestException('No countries provided for mass create');
    }

    const payloads = createCountryDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // ðŸ§  TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: Country[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx
          .insert(countries)
          .values(chunk)
          .returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} countries`,
      data: inserted,
    };
  }

  async bulkRemove(ids: number[]) {
    const numericIds = await this.validateCountries(ids);
    if (!numericIds.length) {
      return { message: 'No valid country IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(countries)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(countries.id, chunk))
          .returning({ id: countries.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} countries in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: number[]) {
    const numericIds = await this.validateCountries(ids, true);
    if (!numericIds.length) {
      return { message: 'No valid countries IDs found.', deletedIds: [] };
    }

    return await this.db.transaction(async (tx) => {
      // Perform soft delete: update deletedAt + updatedAt

      const restoredIds: number[] = [];

      await this.db.transaction(async (tx) => {
        for (let i = 0; i < numericIds.length; i += this.batchSize) {
          const chunk = numericIds.slice(i, i + this.batchSize);

          const updated = await tx
            .update(countries)
            .set({
              deletedAt: null,
              updatedAt: new Date(),
            })
            .where(inArray(countries.id, chunk))
            .returning({ id: countries.id });

          restoredIds.push(...updated.map((r) => r.id));
        }
      });

      return {
        message: `Restored ${restoredIds.length} countries in batches`,
        restoredIds,
      };
    });
  }

  async bulkDelete(ids: number[]) {
    const numericIds = await this.validateCountries(ids, true); // validate regardless of soft-delete status
    if (!numericIds.length) {
      return { message: 'No valid countries IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    return await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        // âœ… Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(countries)
          .where(inArray(countries.id, chunk))
          .returning({ id: countries.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }

      return {
        message: `Permanently deleted ${deletedIds.length} countries in batches.`,
        deletedIds,
      };
    });
  }

  private async validateCountries(
    ids: number[],
    deleted: boolean = false,
  ): Promise<number[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }

    const numericIds = ids.map(Number);

    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(countries.id, numericIds)];

    // If softDelete=true â†’ include only records that are not deleted
    // If softDelete=false â†’ include all, even deleted ones
    conditions.push(
      deleted ? isNotNull(countries.deletedAt) : isNull(countries.deletedAt),
    );

    const existing = await this.db.query.countries.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = numericIds.join(', ');
      throw new DBNotFoundException('Country', { id: idList });
    }

    return numericIds;
  }
}
