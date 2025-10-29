import { Injectable } from '@nestjs/common';
import * as schema from '../../database/schemas/schema'; // Your schema imports
import { UserSeedData } from '../data/users';
import { BaseSeeder } from './base.seeder';

@Injectable()
// Extend the new BaseSeeder class
export class UsersSeeder extends BaseSeeder<typeof schema.users> {
  // 1. Define the specific schema table
  protected readonly schemaTable = schema.users;

  // 2. Define the specific data array
  protected readonly seedData = UserSeedData;

  protected readonly shouldResetSequence = false;

  // The constructor is handled by the base class, but we need to call super()
  // if you explicitly define it here, or omit it if you don't add other injections.

  async seed(): Promise<void> {
    // 4. Use the reusable insertData method defined in the base class
    await this.insertData(this.schemaTable, this.seedData);
  }
}
