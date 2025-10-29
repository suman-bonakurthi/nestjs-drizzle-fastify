import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas/schema';

export const DRIZZLE = Symbol('drizzle-connection');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      // 💡 FIX: Removed the 'async' keyword as there are no 'await' calls inside.
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL is not defined in environment variables',
          );
        }
        const pool = new Pool({
          connectionString: databaseUrl,
          ssl: true,
        });
        return drizzle(pool, {
          schema,
          casing: 'snake_case',
        }) as NodePgDatabase<typeof schema>;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
