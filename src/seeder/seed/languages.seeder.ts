import { Injectable } from '@nestjs/common';
import * as schema from '../../database/schemas/schema'; // Your schema imports
import { LanguageSeedData } from '../data/languages';
import { BaseSeeder } from './base.seeder';

@Injectable()
// Extend the new BaseSeeder class
export class LanguagesSeeder extends BaseSeeder<typeof schema.languages> {
  // 1. Define the specific schema table
  protected readonly schemaTable = schema.languages;

  // 2. Define the specific data array
  protected readonly seedData = LanguageSeedData;

  // The constructor is handled by the base class, but we need to call super()
  // if you explicitly define it here, or omit it if you don't add other injections.

  async seed(): Promise<void> {
    // 4. Use the reusable insertData method defined in the base class
    await this.insertData(this.schemaTable, this.seedData);
  }
}
