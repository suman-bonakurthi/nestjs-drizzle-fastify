// src/seed-cli.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DrizzleReseterService } from '../drizzle-reset/tools/drizzle-reseter.service';
import { SeederService } from './seeder.service';

async function bootstrap() {
  // Create a standalone instance of the NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);

  const seeder = app.get(SeederService);
  const reseter = app.get(DrizzleReseterService);

  try {
    await reseter.runReset();
    await seeder.runSeeders();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
