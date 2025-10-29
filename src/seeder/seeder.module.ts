import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DrizzleResetModule } from '../drizzle-reset/drizzle-reset.module';
import { CitiesSeeder } from './seed/cities.seeder';
import { ContactsSeeder } from './seed/contacts.seeder';
import { CountriesSeeder } from './seed/countries.seeder';
import { CurrenciesSeeder } from './seed/currencies.seeder';
import { LanguagesSeeder } from './seed/languages.seeder';
import { LocationsSeeder } from './seed/locations.seeder';
import { OrganizationLocationsSeeder } from './seed/organization-locations.seeder';
import { OrganizationUsersSeeder } from './seed/organization-users.seeder';
import { OrganizationsSeeder } from './seed/organizations.seeder';
import { UsersSeeder } from './seed/users.seeder';
import { SeederService } from './seeder.service';

@Module({
  // IMPORTANT: You need access to the Drizzle connection
  imports: [DatabaseModule, DrizzleResetModule],

  // Register all services as providers
  providers: [
    SeederService,
    OrganizationsSeeder,
    CitiesSeeder,
    ContactsSeeder,
    CountriesSeeder,
    CurrenciesSeeder,
    LanguagesSeeder,
    LocationsSeeder,
    UsersSeeder,
    OrganizationLocationsSeeder,
    OrganizationUsersSeeder,
  ],
  // Export the service so the CLI script can access it
  exports: [SeederService],
})
export class SeederModule {}
