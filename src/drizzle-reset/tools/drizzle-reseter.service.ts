import { Injectable, Logger } from '@nestjs/common';
import { ResetDb } from './reset-db';
import { Reseter } from './reseter.interface';

@Injectable()
export class DrizzleReseterService implements Reseter {
  private readonly logger = new Logger(DrizzleReseterService.name);

  constructor(private readonly reset: ResetDb) {}

  async runReset(): Promise<void> {
    this.logger.log('Clearing database with Drizzle-seed...');
    await this.reset.runReset();
  }
}
