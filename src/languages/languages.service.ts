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
import { countries, languages } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateLanguageDto } from './dto/create-language.dto';
import { FilterLanguageDto } from './dto/filter-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language } from './entities/language.entity';

@Injectable()
export class LanguagesService {
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

  async create(createLanguageDto: CreateLanguageDto) {
    return await this.db
      .insert(languages)
      .values({ ...createLanguageDto, updatedAt: new Date() })
      .returning({ id: languages.id });
  }

  async update(id: number, updateLanguageDto: UpdateLanguageDto) {
    const result = await this.db
      .update(languages)
      .set({ ...updateLanguageDto, updatedAt: new Date() })
      .where(eq(languages.id, id))
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
      ? and(eq(languages.id, id), isNotNull(languages.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(languages.id, id), isNull(languages.deletedAt));

    const result = await this.db.query.languages.findFirst({
      columns: {
        id: true,
        name: true,
        code: true,
        native: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('Language', { id });

    return result;
  }

  async remove(id: number) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(languages)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(languages.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(languages)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(languages.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: number) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(languages)
      .where(eq(languages.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(
    filterLanguageDto: FilterLanguageDto,
    deleted: boolean = false,
  ) {
    const {
      name,
      code,
      createdAt,
      sortBy = 'name',
      order = 'asc',
    } = filterLanguageDto;

    // ---- Pagination Config ----

    const limit = Math.min(
      filterLanguageDto.limit ?? this.minLimit,
      this.maxLimit,
    );
    const offset = filterLanguageDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: languages.id,
      name: languages.name,
      code: languages.code,
      createdAt: languages.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? languages.name;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted ? isNotNull(languages.deletedAt) : isNull(languages.deletedAt),
      ...(name ? [ilike(languages.name, `%${name}%`)] : []),
      ...(code ? [ilike(languages.code, `%${code}%`)] : []),
      ...(createdAt ? [lte(languages.createdAt, new Date(createdAt))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        languageId: languages.id,
        languageName: languages.name,
        languageCode: languages.code,
        languageNative: languages.native,
        countryName: languages.name,
        languageCreatedAt: languages.createdAt,
        languageDeletedAt: languages.deletedAt,
        total_count: sql<number>`COUNT(*) OVER()`, // âœ… Window function in Drizzle
      })
      .from(languages)
      .leftJoin(countries, eq(languages.countryId, countries.id))
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.languageId,
        name: r.languageName,
        code: r.languageCode,
        native: r.languageNative,
        countryName: r.countryName,
        createdAt: r.languageCreatedAt,
        deletedAt: r.languageDeletedAt,
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createLanguageDto: CreateLanguageDto[]) {
    if (!createLanguageDto?.length) {
      throw new BadRequestException('No languages provided for mass create');
    }

    const payloads = createLanguageDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // ðŸ§  TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: Language[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx
          .insert(languages)
          .values(chunk)
          .returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} languages`,
      data: inserted,
    };
  }

  async bulkRemove(ids: number[]) {
    const numericIds = await this.validateLanguages(ids);
    if (!numericIds.length) {
      return { message: 'No valid country IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(languages)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(languages.id, chunk))
          .returning({ id: languages.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} countries in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: number[]) {
    const numericIds = await this.validateLanguages(ids, true);
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
            .update(languages)
            .set({
              deletedAt: null,
              updatedAt: new Date(),
            })
            .where(inArray(languages.id, chunk))
            .returning({ id: languages.id });

          restoredIds.push(...updated.map((r) => r.id));
        }
      });

      return {
        message: `Restored ${restoredIds.length} languages in batches`,
        restoredIds,
      };
    });
  }

  async bulkDelete(ids: number[]) {
    const numericIds = await this.validateLanguages(ids, true); // validate regardless of soft-delete status
    if (!numericIds.length) {
      return { message: 'No valid languages IDs found.', deletedIds: [] };
    }

    const deletedIds: number[] = [];

    return await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        // âœ… Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(languages)
          .where(inArray(languages.id, chunk))
          .returning({ id: languages.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }

      return {
        message: `Permanently deleted ${deletedIds.length} languages in batches.`,
        deletedIds,
      };
    });
  }

  private async validateLanguages(
    ids: number[],
    deleted: boolean = false,
  ): Promise<number[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }

    const numericIds = ids.map(Number);

    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(languages.id, numericIds)];

    // If softDelete=true â†’ include only records that are not deleted
    // If softDelete=false â†’ include all, even deleted ones
    conditions.push(
      deleted ? isNotNull(languages.deletedAt) : isNull(languages.deletedAt),
    );

    const existing = await this.db.query.languages.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = numericIds.join(', ');
      throw new DBNotFoundException('Language', { id: idList });
    }

    return numericIds;
  }
}
