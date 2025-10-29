// Define the type for the data structure to ensure type safety with Drizzle insertion
import { Country } from '../../countries/entities/country.entity';
// import { Country } from '../../countries/entities/country.entity';
/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const CountrySeedData: Country[] = [
  {
    id: 1,
    name: 'United States',
    iso: 'US',
    flag: '🇺🇸',
    currencyId: 1,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 2,
    name: 'Canada',
    iso: 'CA',
    flag: '🇨🇦',
    currencyId: 5,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 3,
    name: 'United Kingdom',
    iso: 'GB',
    flag: '🇬🇧',
    currencyId: 3,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 4,
    name: 'Germany',
    iso: 'DE',
    flag: '🇩🇪',
    currencyId: 2,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 5,
    name: 'Japan',
    iso: 'JP',
    flag: '🇯🇵',
    currencyId: 4,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 6,
    name: 'Australia',
    iso: 'AU',
    flag: '🇦🇺',
    currencyId: 6,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 7,
    name: 'India',
    iso: 'IN',
    flag: '🇮🇳',
    currencyId: 7,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 8,
    name: 'Vietnam',
    iso: 'VN',
    flag: '🇻🇳',
    currencyId: 8,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 9,
    name: 'China',
    iso: 'CN',
    flag: '🇨🇳',
    currencyId: 9, // Assumes CNY (Chinese Yuan) is ID 6
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
];
