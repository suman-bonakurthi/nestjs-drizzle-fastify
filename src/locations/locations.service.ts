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
import { cities, locations } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateLocationDto } from './dto/create-location.dto';
import { FilterLocationDto } from './dto/filter-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationsService {
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

  async create(CreateLocationDto: CreateLocationDto) {
    return await this.db
      .insert(locations)
      .values({ ...CreateLocationDto, updatedAt: new Date() })
      .returning({ id: locations.id });
  }

  async update(id: number, updateLocationDto: UpdateLocationDto) {
    const result = await this.db
      .update(locations)
      .set({ ...updateLocationDto, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();

    if (result.length === 0) {
      throw new DBNotFoundException('Location', { id });
    }

    return result[0];
  }

  async findOne(id: number, deleted = false) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('A valid Location ID is required');
    }

    const whereClause = deleted
      ? and(eq(locations.id, id), isNotNull(locations.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(locations.id, id), isNull(locations.deletedAt));

    const result = await this.db.query.locations.findFirst({
      columns: {
        id: true,
        address: true,
        title: true,
        postalCode: true,
        isPrimary: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('Location', { id });

    return result;
  }

  async remove(id: number) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(locations)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(locations.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(locations)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(locations)
      .where(eq(locations.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(
    filterLocationDto: FilterLocationDto,
    deleted: boolean = false,
  ) {
    const {
      postalCode,
      cityName,
      createdAt,
      sortBy = 'cityName',
      order = 'asc',
    } = filterLocationDto;

    // ---- Pagination Config ----

    const limit = Math.min(
      filterLocationDto.limit ?? this.minLimit,
      this.maxLimit,
    );
    const offset = filterLocationDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: locations.id,
      name: cities.name,
      createdAt: locations.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? cities.name;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted ? isNotNull(locations.deletedAt) : isNull(locations.deletedAt),
      ...(postalCode ? [ilike(locations.postalCode, `%${postalCode}%`)] : []),
      ...(cityName ? [ilike(cities.name, `%${cityName}%`)] : []),
      ...(createdAt ? [lte(locations.createdAt, new Date(createdAt))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        locationId: locations.id,
        locationAddress: locations.address,
        locationTitle: locations.title,
        locationPostalCode: locations.postalCode,
        locationIsPrimary: locations.isPrimary,
        cityName: cities.name,
        locationCreatedAt: locations.createdAt,
        locationDeletedAt: locations.deletedAt,
        total_count: sql<number>`COUNT(*) OVER()`, // Ã¢Å“â€¦ Window function in Drizzle
      })
      .from(locations)
      .leftJoin(cities, eq(locations.cityId, cities.id))
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.locationId,
        address: r.locationAddress,
        title: r.locationTitle,
        postalCode: r.locationPostalCode,
        isPrimary: r.locationIsPrimary,
        cityName: r.cityName,
        createdAt: r.locationCreatedAt,
        deletedAt: r.locationDeletedAt,
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createLocationDto: CreateLocationDto[]) {
    if (!createLocationDto?.length) {
      throw new BadRequestException('No locations provided for mass create');
    }

    const payloads = createLocationDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // Ã°Å¸Â§  TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: Location[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx
          .insert(locations)
          .values(chunk)
          .returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} locations`,
      data: inserted,
    };
  }

  async bulkRemove(ids: number[]) {
    const numericIds = await this.validateLocations(ids);
    if (!numericIds.length) {
      return { message: 'No valid locations IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(locations)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(locations.id, chunk))
          .returning({ id: locations.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} locations in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: number[]) {
    const numericIds = await this.validateLocations(ids, true);
    if (!numericIds.length) {
      return { message: 'No valid locations IDs found.', deletedIds: [] };
    }

    return await this.db.transaction(async (tx) => {
      // Perform soft delete: update deletedAt + updatedAt

      const restoredIds: number[] = [];

      await this.db.transaction(async (tx) => {
        for (let i = 0; i < numericIds.length; i += this.batchSize) {
          const chunk = numericIds.slice(i, i + this.batchSize);

          const updated = await tx
            .update(locations)
            .set({
              deletedAt: null,
              updatedAt: new Date(),
            })
            .where(inArray(locations.id, chunk))
            .returning({ id: locations.id });

          restoredIds.push(...updated.map((r) => r.id));
        }
      });

      return {
        message: `Restored ${restoredIds.length} locations in batches`,
        restoredIds,
      };
    });
  }

  async bulkDelete(ids: number[]) {
    const numericIds = await this.validateLocations(ids, true); // validate regardless of soft-delete status
    if (!numericIds.length) {
      return { message: 'No valid locations IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    return await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        // Ã¢Å“â€¦ Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(locations)
          .where(inArray(locations.id, chunk))
          .returning({ id: locations.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }

      return {
        message: `Permanently deleted ${deletedIds.length} locations in batches.`,
        deletedIds,
      };
    });
  }

  private async validateLocations(
    ids: number[],
    deleted: boolean = false,
  ): Promise<number[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }

    const numericIds = ids.map(Number);

    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(locations.id, numericIds)];

    // If softDelete=true Ã¢â€ â€™ include only records that are not deleted
    // If softDelete=false Ã¢â€ â€™ include all, even deleted ones
    conditions.push(
      deleted ? isNotNull(locations.deletedAt) : isNull(locations.deletedAt),
    );

    const existing = await this.db.query.locations.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = numericIds.join(', ');
      throw new DBNotFoundException('Location', { id: idList });
    }

    return numericIds;
  }
}
