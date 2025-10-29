import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { DrizzleResetModule } from './drizzle-reset/drizzle-reset.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SeederModule } from './seeder/seeder.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { LanguagesModule } from './languages/languages.module';
import { ContactsModule } from './contacts/contacts.module';
import { CitiesModule } from './cities/cities.module';
import { LocationsModule } from './locations/locations.module';
import { CountriesModule } from './countries/countries.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig],
      isGlobal: true,
      expandVariables: true,
    }),
    DatabaseModule,
    OrganizationsModule,
    SeederModule,
    DrizzleResetModule,
    CurrenciesModule,
    LanguagesModule,
    ContactsModule,
    CitiesModule,
    LocationsModule,
    CountriesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
