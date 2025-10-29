import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DrizzleReseterService } from './tools/drizzle-reseter.service';
import { ResetDb } from './tools/reset-db';

@Module({
  imports: [DatabaseModule],
  providers: [DrizzleReseterService, ResetDb],
  exports: [DrizzleReseterService],
})
export class DrizzleResetModule {}
