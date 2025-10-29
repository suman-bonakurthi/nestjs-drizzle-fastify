// src/database/seed/database-seeder.service.ts
import { Injectable, Logger } from '@nestjs/common';
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
import { Seeder } from './seeder.interface';
// import { UsersSeeder } from './users.seeder';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  // 2. Inject all individual seeders into the constructor
  private readonly seeders: { instance: Seeder; order: number }[];

  constructor(
    private readonly organizationsSeeder: OrganizationsSeeder,
    private readonly citiesSeeder: CitiesSeeder,
    private readonly contactsSeeder: ContactsSeeder,
    private readonly countriesSeeder: CountriesSeeder,
    private readonly currenciesSeeder: CurrenciesSeeder,
    private readonly languagesSeeder: LanguagesSeeder,
    private readonly locationsSeeder: LocationsSeeder,
    private readonly usersSeeder: UsersSeeder,
    private readonly organizationLocationsSeeder: OrganizationLocationsSeeder,
    private readonly organizationUsersSeeder: OrganizationUsersSeeder,
    // ... inject other seeders
  ) {
    this.seeders = [
      { instance: this.currenciesSeeder, order: 1 },
      { instance: this.countriesSeeder, order: 2 },
      { instance: this.languagesSeeder, order: 3 },
      { instance: this.citiesSeeder, order: 4 },
      { instance: this.organizationsSeeder, order: 5 },
      { instance: this.locationsSeeder, order: 6 },
      { instance: this.usersSeeder, order: 7 },
      { instance: this.contactsSeeder, order: 8 },
      { instance: this.organizationUsersSeeder, order: 9 },
      { instance: this.organizationLocationsSeeder, order: 10 },
    ];
  }

  async runSeeders(): Promise<void> {
    this.logger.log('--- Starting Database Seeding Process ---');

    // 3. Sort seeders by the 'order' property to respect dependencies
    const sortedSeeders = this.seeders.sort((a, b) => a.order - b.order);

    for (const { instance, order } of sortedSeeders) {
      this.logger.log(
        `Executing seeder: ${instance.constructor.name} (Order: ${order})`,
      );
      await instance.seed();
    }

    this.logger.log('--- Database Seeding Process Complete ---');
  }
}
