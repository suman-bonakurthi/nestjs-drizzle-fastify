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
import { cities, countries } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateCityDto } from './dto/create-city.dto';
import { FilterCityDto } from './dto/filter-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { City } from './entities/city.entity';

@Injectable()
export class CitiesService {
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

  async create(createCityDto: CreateCityDto) {
    return await this.db
      .insert(cities)
      .values({ ...createCityDto, updatedAt: new Date() })
      .returning({ id: cities.id });
  }

  async update(id: number, updateCityDto: UpdateCityDto) {
    const result = await this.db
      .update(cities)
      .set({ ...updateCityDto, updatedAt: new Date() })
      .where(eq(cities.id, id))
      .returning();

    if (result.length === 0) {
      throw new DBNotFoundException('City', { id });
    }

    return result[0];
  }

  async findOne(id: number, deleted = false) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('A valid City ID is required');
    }

    const whereClause = deleted
      ? and(eq(cities.id, id), isNotNull(cities.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(cities.id, id), isNull(cities.deletedAt));

    const result = await this.db.query.cities.findFirst({
      columns: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('City', { id });

    return result;
  }

  async remove(id: number) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(cities)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cities.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(cities)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(cities.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(cities)
      .where(eq(cities.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(filterCityDto: FilterCityDto, deleted: boolean = false) {
    const {
      name,
      countryName,
      createdAt,
      sortBy = 'cityName',
      order = 'asc',
    } = filterCityDto;

    // ---- Pagination Config ----

    const limit = Math.min(filterCityDto.limit ?? this.minLimit, this.maxLimit);
    const offset = filterCityDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: cities.id,
      name: cities.name,
      createdAt: cities.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? cities.name;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted ? isNotNull(cities.deletedAt) : isNull(cities.deletedAt),
      ...(name ? [ilike(cities.name, `%${name}%`)] : []),
      ...(countryName ? [ilike(countries.name, `%${countryName}%`)] : []),
      ...(createdAt ? [lte(cities.createdAt, new Date(createdAt))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        cityId: cities.id,
        cityName: cities.name,
        countryName: countries.name,
        cityCreatedAt: cities.createdAt,
        cityDeletedAt: cities.deletedAt,
        total_count: sql<number>`COUNT(*) OVER()`, // Ã¢Å“â€¦ Window function in Drizzle
      })
      .from(cities)
      .leftJoin(countries, eq(cities.countryId, countries.id))
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.cityId,
        name: r.cityName,
        countryName: r.countryName,
        createdAt: r.cityCreatedAt,
        deletedAt: r.cityDeletedAt,
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createCityDto: CreateCityDto[]) {
    if (!createCityDto?.length) {
      throw new BadRequestException('No cities provided for mass create');
    }

    const payloads = createCityDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // Ã°Å¸Â§  TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: City[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx.insert(cities).values(chunk).returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} cities`,
      data: inserted,
    };
  }

  async bulkRemove(ids: number[]) {
    const numericIds = await this.validateCities(ids);
    if (!numericIds.length) {
      return { message: 'No valid cities IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(cities)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(cities.id, chunk))
          .returning({ id: cities.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} cities in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: number[]) {
    const numericIds = await this.validateCities(ids, true);
    if (!numericIds.length) {
      return { message: 'No valid cities IDs found.', restoredIds: [] };
    }

    const restoredIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(cities)
          .set({
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(inArray(cities.id, chunk))
          .returning({ id: cities.id });

        restoredIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Restored ${restoredIds.length} cities in batches`,
      restoredIds,
    };
  }

  async bulkDelete(ids: number[]) {
    const numericIds = await this.validateCities(ids, true); // validate regardless of soft-delete status
    if (!numericIds.length) {
      return { message: 'No valid cities IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    return await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        // Ã¢Å“â€¦ Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(cities)
          .where(inArray(cities.id, chunk))
          .returning({ id: cities.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }

      return {
        message: `Permanently deleted ${deletedIds.length} cities in batches.`,
        deletedIds,
      };
    });
  }

  private async validateCities(
    ids: number[],
    deleted: boolean = false,
  ): Promise<number[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }

    const numericIds = ids.map(Number);

    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(cities.id, numericIds)];

    // If softDelete=true Ã¢â€ â€™ include only records that are not deleted
    // If softDelete=false Ã¢â€ â€™ include all, even deleted ones
    conditions.push(
      deleted ? isNotNull(cities.deletedAt) : isNull(cities.deletedAt),
    );

    const existing = await this.db.query.cities.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = numericIds.join(', ');
      throw new DBNotFoundException('City', { id: idList });
    }

    return numericIds;
  }
}
