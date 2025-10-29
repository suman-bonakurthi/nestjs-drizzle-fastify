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
import { users } from '../database/schemas/schema';
import type { DrizzleDatabase } from '../database/types/drizzle';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
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

  async create(createUserDto: CreateUserDto) {
    return await this.db
      .insert(users)
      .values({ ...createUserDto, updatedAt: new Date() })
      .returning({ id: users.id });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const result = await this.db
      .update(users)
      .set({ ...updateUserDto, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (result.length === 0) {
      throw new DBNotFoundException('User', { id });
    }

    return result[0];
  }

  async findOne(id: string, deleted = false) {
    if (!id) {
      throw new BadRequestException('A valid User ID is required');
    }

    const whereClause = deleted
      ? and(eq(users.id, id), isNotNull(users.deletedAt)) // FIX: Should check for *IS NOT NULL* for deleted records
      : and(eq(users.id, id), isNull(users.deletedAt));

    const result = await this.db.query.users.findFirst({
      columns: {
        id: true,
        userName: true,
        email: true,
        password: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      where: whereClause,
    });

    if (!result) throw new DBNotFoundException('User', { id });

    return result;
  }

  async remove(id: string) {
    const query = await this.findOne(id);

    const result = await this.db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, query.id))
      .returning();

    return result[0];
  }

  async restore(id: string) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .update(users)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, query.id))
      .returning();

    return result[0];
  }

  async delete(id: string) {
    const query = await this.findOne(id, true);

    const result = await this.db
      .delete(users)
      .where(eq(users.id, query.id))
      .returning();

    // 4. Return a confirmation
    return result;
  }

  async findAll(filterUserDto: FilterUserDto, deleted: boolean = false) {
    const {
      userName,
      email,
      createdAt,
      sortBy = 'name',
      order = 'asc',
    } = filterUserDto;

    // ---- Pagination Config ----

    const limit = Math.min(filterUserDto.limit ?? this.minLimit, this.maxLimit);
    const offset = filterUserDto.offset ?? this.defaultOffset;

    // ---- Sort ----
    const allowedSortColumns = {
      id: users.id,
      name: users.userName,
      createdAt: users.createdAt,
    };
    const sortColumn = allowedSortColumns[sortBy] ?? users.userName;
    const sortOrder =
      order.toUpperCase() === 'ASC' ? asc(sortColumn) : desc(sortColumn);

    // ---- Filters ----
    const conditions: SQL[] = [
      deleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt),
      ...(userName ? [ilike(users.userName, `%${userName}%`)] : []),
      ...(email ? [ilike(users.email, `%${email}%`)] : []),
      ...(createdAt ? [lte(users.createdAt, new Date(createdAt))] : []),
    ];

    // ---- Query ----
    const rows = await this.db
      .select({
        userId: users.id,
        userName: users.userName,
        userEmail: users.email,
        userPassword: users.password,
        userCreatedAt: users.createdAt,
        userDeletedAt: users.deletedAt,
        total_count: sql<number>`COUNT(*) OVER()`, // Ã¢Å“â€¦ Window function in Drizzle
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;

    // ---- Return ----
    return {
      data: rows.map((r) => ({
        id: r.userId,
        userName: r.userName,
        email: r.userEmail,
        password: r.userPassword,
        createdAt: r.userCreatedAt,
        deletedAt: r.userDeletedAt,
      })),
      limit,
      offset,
      count: totalCount,
    };
  }

  async bulkCreate(createUserDto: CreateUserDto[]) {
    if (!createUserDto?.length) {
      throw new BadRequestException('No users provided for mass create');
    }

    const payloads = createUserDto.map((dto) => ({
      ...dto,
      // If client supplied a Date object it's used; otherwise use now
      updatedAt: new Date(),
      // If you want to ensure createdAt also exists, set similarly:
      // createdAt: dto.createdAt ?? now,
    }));

    const inserted = await this.db.transaction(async (tx) => {
      // Ã°Å¸Â§  TIP: Split into batches if inserting thousands of records
      // (Postgres can struggle with very large multi-row inserts)

      const results: User[] = [];

      for (let i = 0; i < payloads.length; i += this.batchSize) {
        const chunk = payloads.slice(i, i + this.batchSize);
        const batchInserted = await tx.insert(users).values(chunk).returning();

        results.push(...batchInserted);
      }

      return results;
    });

    return {
      message: `Successfully created ${inserted.length} users`,
      data: inserted,
    };
  }

  async bulkRemove(ids: string[]) {
    const numericIds = await this.validateUsers(ids);
    if (!numericIds.length) {
      return { message: 'No valid users IDs found.', deletedIds: [] };
    }

    const deletedIds: string[] = [];

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < numericIds.length; i += this.batchSize) {
        const chunk = numericIds.slice(i, i + this.batchSize);

        const updated = await tx
          .update(users)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(users.id, chunk))
          .returning({ id: users.id });

        deletedIds.push(...updated.map((r) => r.id));
      }
    });

    return {
      message: `Soft-deleted ${deletedIds.length} users in batches`,
      deletedIds,
    };
  }

  async bulkRestore(ids: string[]) {
    const validUserIds = await this.validateUsers(ids, true);
    if (!validUserIds.length) {
      return { message: 'No valid users IDs found.', deletedIds: [] };
    }

    return await this.db.transaction(async (tx) => {
      // Perform soft delete: update deletedAt + updatedAt

      const restoredIds: string[] = [];

      await this.db.transaction(async (tx) => {
        for (let i = 0; i < validUserIds.length; i += this.batchSize) {
          const chunk = validUserIds.slice(i, i + this.batchSize);

          const updated = await tx
            .update(users)
            .set({
              deletedAt: null,
              updatedAt: new Date(),
            })
            .where(inArray(users.id, chunk))
            .returning({ id: users.id });

          restoredIds.push(...updated.map((r) => r.id));
        }
      });

      return {
        message: `Restored ${restoredIds.length} users in batches`,
        restoredIds,
      };
    });
  }

  async bulkDelete(ids: string[]) {
    const validUserIds = await this.validateUsers(ids, true); // validate regardless of soft-delete status
    if (!validUserIds.length) {
      return { message: 'No valid users IDs found.', deletedIds: [] };
    }

    const deletedIds: string[] = [];

    return await this.db.transaction(async (tx) => {
      for (let i = 0; i < validUserIds.length; i += this.batchSize) {
        const chunk = validUserIds.slice(i, i + this.batchSize);

        // Ã¢Å“â€¦ Use the chunk (not the full numericIds array)
        const deleted = await tx
          .delete(users)
          .where(inArray(users.id, chunk))
          .returning({ id: users.id });

        deletedIds.push(...deleted.map((r) => r.id));
      }

      return {
        message: `Permanently deleted ${deletedIds.length} users in batches.`,
        deletedIds,
      };
    });
  }

  private async validateUsers(
    ids: string[],
    deleted: boolean = false,
  ): Promise<string[]> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('IDs array is required');
    }
    // Build where conditions dynamically
    const conditions: SQL[] = [inArray(users.id, ids)];

    // If softDelete=true Ã¢â€ â€™ include only records that are not deleted
    // If softDelete=false Ã¢â€ â€™ include all, even deleted ones
    conditions.push(
      deleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt),
    );

    const existing = await this.db.query.users.findMany({
      where: and(...conditions),
    });

    if (existing.length === 0) {
      const idList = ids.join(', ');
      throw new DBNotFoundException('User', { id: idList });
    }

    return ids;
  }
}
