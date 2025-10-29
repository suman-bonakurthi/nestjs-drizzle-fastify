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
import { currencies } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { FilterCurrencyDto } from './dto/filter-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { Currency } from './entities/currency.entity';

@Injectable()
export class CurrenciesService {
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

  async create(createCurrencyDTO: CreateCurrencyDto) {
    return await this.db
      .insert(currencies)
      .values({ ...createCurrencyDTO, updatedAt: new Date() })
      .returning({ id: currencies.id });
  }

  async update(id: number, updateCurrencyDto: UpdateCurrencyDto) {
    const result = await this.db
      .update(currencies)
      .set({ ...updateCurrencyDto, updatedAt: new Date() })
      .where(eq(currencies.id, id))
      .returning();

    if (result.length === 0) {
      throw new DBNotFoundException('Currency', { id });
    }

    return result[0];
  }

  async findOne(id: number, deleted = false) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('A valid Country ID is required');
    }

    const whereClause = deleted
      ? and(eq(currencies.id, id), isNotNull(currencies.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(currencies.id, id), isNull(currencies.deletedAt));

    const result = await this.db.query.currencies.findFirst({
      columns: {
        id: true,
        name: true,
        code: true,
        symbol: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('Currency', { id });

    return result;
  }

  async remove(id: number) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(currencies)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(currencies.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(currencies)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(currencies.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(currencies)
      .where(eq(currencies.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(
    filterCurrencyDto: FilterCurrencyDto,
    deleted: boolean = false,
  ) {
    const {
      name,
      code,
      createdAt,
      sortBy = 'name',
      order = 'asc',
    } = filterCurrencyDto;

    // ---- Pagination Config ----

    const limit = Math.min(
      filterCurrencyDto.limit ?? this.minLimit,
      this.maxLimit,
    );
    const offset = filterCurrencyDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: currencies.id,
      name: currencies.name,
      createdAt: currencies.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? currencies.name;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted ? isNotNull(currencies.deletedAt) : isNull(currencies.deletedAt),
      ...(name ? [ilike(currencies.name, `%${name}%`)] : []),
      ...(code ? [ilike(currencies.code, `%${code}%`)] : []),
      ...(createdAt ? [lte(currencies.createdAt, new Date(createdAt))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        currencyId: currencies.id,
        currencyName: currencies.name,
        currencyCode: currencies.code,
        currencySymbol: currencies.symbol,
        currencyCreatedAt: currencies.createdAt,
        currencyDeletedAt: currencies.deletedAt,
        total_count: sql<number>`COUNT(*) OVER()`, // âœ… Window function in Drizzle
      })
      .from(currencies)
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.currencyId,
        name: r.currencyName,
        code: r.currencyCode,
        symbol: r.currencySymbol,
        currency: r.currencyName,
        createdAt: r.currencyCreatedAt,
        deletedAt: r.currencyDeletedAt,
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createCurrencyDto: CreateCurrencyDto[]) {
    if (!createCurrencyDto?.length) {
      throw new BadRequestException('No currencies provided for mass create');
    }

    const payloads = createCurrencyDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // ðŸ§  TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: Currency[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx
          .insert(currencies)
          .values(chunk)
          .returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} currencies`,
      data: inserted,
    };
  }

  async bulkRemove(ids: number[]) {
    const numericIds = await this.validateCurrencies(ids);
    if (!numericIds.length) {
      return { message: 'No valid country IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(currencies)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(currencies.id, chunk))
          .returning({ id: currencies.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} currencies in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: number[]) {
    const numericIds = await this.validateCurrencies(ids, true);
    if (!numericIds.length) {
      return { message: 'No valid currencies IDs found.', deletedIds: [] };
    }

    return await this.db.transaction(async (tx) => {
      // Perform soft delete: update deletedAt + updatedAt

      const restoredIds: number[] = [];

      await this.db.transaction(async (tx) => {
        for (let i = 0; i < numericIds.length; i += this.batchSize) {
          const chunk = numericIds.slice(i, i + this.batchSize);

          const updated = await tx
            .update(currencies)
            .set({
              deletedAt: null,
              updatedAt: new Date(),
            })
            .where(inArray(currencies.id, chunk))
            .returning({ id: currencies.id });

          restoredIds.push(...updated.map((r) => r.id));
        }
      });

      return {
        message: `Restored ${restoredIds.length} currencies in batches`,
        restoredIds,
      };
    });
  }

  async bulkDelete(ids: number[]) {
    const numericIds = await this.validateCurrencies(ids, true); // validate regardless of soft-delete status
    if (!numericIds.length) {
      return { message: 'No valid currencies IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    return await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        // âœ… Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(currencies)
          .where(inArray(currencies.id, chunk))
          .returning({ id: currencies.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }

      return {
        message: `Permanently deleted ${deletedIds.length} currencies in batches.`,
        deletedIds,
      };
    });
  }

  private async validateCurrencies(
    ids: number[],
    deleted: boolean = false,
  ): Promise<number[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }

    const numericIds = ids.map(Number);

    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(currencies.id, numericIds)];

    // If softDelete=true â†’ include only records that are not deleted
    // If softDelete=false â†’ include all, even deleted ones
    conditions.push(
      deleted ? isNotNull(currencies.deletedAt) : isNull(currencies.deletedAt),
    );

    const existing = await this.db.query.currencies.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = numericIds.join(', ');
      throw new DBNotFoundException('Currency', { id: idList });
    }

    return numericIds;
  }
}
