import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { reset } from 'drizzle-seed';
import { DRIZZLE } from '../../database/database.module'; // Adjust path if needed
import * as schema from '../../database/schemas/schema';
import { Reseter } from './reseter.interface';

/**
 * BaseSeeder is an abstract generic class that provides common implementation for database seeding.
 * It handles Drizzle connection injection, logging, and reusable insertion logic.
 * T extends AnyDrizzleTable is the specific table schema (e.g., typeof schema.entities)
 */
@Injectable()
export class ResetDb implements Reseter {
  private readonly logger = new Logger(ResetDb.name);
  constructor(
    @Inject(DRIZZLE)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {}

  public async runReset(): Promise<void> {
    this.logger.log(`Starting reseting the database for seeding....`);
    try {
      await reset(this.db, schema);
      this.logger.log(`Database Reset successfully.`);
    } catch (error) {
      this.logger.error(`Failed to Reset the Database!`, error.message);
      throw error;
    }
  }
}
