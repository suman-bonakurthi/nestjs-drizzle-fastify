import { Inject, Logger } from '@nestjs/common';
import { InferInsertModel, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTable } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '../../database/database.module'; // Adjust path if needed
import { Seeder } from '../seeder.interface';

// Define a union type for Drizzle schema tables
type DrizzleTable = PgTable;

/**
 * BaseSeeder is an abstract generic class that provides common implementation for database seeding.
 * It handles Drizzle connection injection, logging, and reusable insertion logic.
 * T extends AnyDrizzleTable is the specific table schema (e.g., typeof schema.entities)
 */
export abstract class BaseSeeder<T extends DrizzleTable> implements Seeder {
  // Must be implemented by child class (e.g., schema.entities)
  protected abstract readonly schemaTable: T;

  // Must be implemented by child class (e.g., EntitySeedData)
  protected abstract readonly seedData: InferInsertModel<T>[];

  protected readonly shouldResetSequence: boolean = true;

  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject(DRIZZLE)
    // Using unknown instead of any to satisfy linter, as full schema type is unavailable here
    protected readonly db: NodePgDatabase<Record<string, unknown>>,
  ) {}

  public abstract seed(): Promise<void>;

  /**
   * Protected method to perform the standard Drizzle bulk insertion, handling
   * table name logging and conflict resolution.
   */
  protected async insertData(
    table: T,
    data: InferInsertModel<T>[],
  ): Promise<void> {
    // FIX: Access the internal Drizzle property $tableName instead of the

    const tableName = this.getTableName(table);
    if (!tableName) {
      throw new Error('❌ Could not determine table name for seeding');
    }

    this.logger.log(`Starting seeding for table: ${tableName}...`);
    try {
      await this.db.delete(table);
      this.logger.log(`Table ${tableName} cleared successfully.`);
    } catch (error) {
      // In a real app, you might need TRUNCATE CASCADE, but DELETE is safer for seeding.
      this.logger.error(
        `Failed to clear table ${tableName}. Check foreign key constraints!`,
        error.message,
      );
      throw error;
    }

    if (data.length > 0) {
      await this.db.insert(table).values(data).onConflictDoNothing();
      this.logger.log(`✅ Inserted ${data.length} records into ${tableName}`);
    } else {
      this.logger.warn(`⚠️ No seed data provided for ${tableName}`);
    }

    // Only reset sequence if needed
    if (this.shouldResetSequence) {
      await this.resetSequence(tableName);
    } else {
      this.logger.log(
        `⏭️ Skipping sequence reset for ${tableName}: No 'id' column found (likely composite key).`,
      );
    }

    this.logger.log(`🎯 Seeding complete for table: ${tableName}`);
  }

  protected getTableName(table: T): string | undefined {
    const baseNameSymbol = Object.getOwnPropertySymbols(table).find(
      (s) => s.toString() === 'Symbol(drizzle:BaseName)',
    );

    if (!baseNameSymbol) return undefined;

    return Reflect.get(table, baseNameSymbol) as string | undefined;
  }

  protected async resetSequence(
    tableName: string,
    columnName = 'id',
  ): Promise<void> {
    // Use sql.raw for ALL injections.
    // pg_get_serial_sequence expects string literals, so we must add the quotes within sql.raw.
    // MAX() and FROM expect raw identifiers, so we pass them without quotes.
    this.logger.log(`🎯 Sequence reset for table: ${tableName}`);
    await this.db.execute(
      sql`SELECT setval(
      pg_get_serial_sequence(${sql.raw(`'${tableName}'`)}, ${sql.raw(`'${columnName}'`)}),
      COALESCE((SELECT MAX(${sql.raw(columnName)}) FROM ${sql.raw(tableName)}), 1)
    );`,
    );
  }
}
