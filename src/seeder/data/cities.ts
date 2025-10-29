import { City } from '../../cities/entities/city.entity';

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const CitiesSeedData: City[] = [
  // --- United States (countryId: 1) ---
  {
    id: 1,
    name: 'New York City',
    countryId: 1,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 2,
    name: 'Los Angeles',
    countryId: 1,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 3,
    name: 'Chicago',
    countryId: 1,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  // --- Canada (countryId: 2) ---
  {
    id: 4,
    name: 'Toronto',
    countryId: 2,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 5,
    name: 'Vancouver',
    countryId: 6,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 6,
    name: 'Montreal',
    countryId: 2,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  // --- United Kingdom (countryId: 3) ---
  {
    id: 7,
    name: 'London',
    countryId: 3,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 8,
    name: 'Manchester',
    countryId: 3,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 9,
    name: 'Birmingham',
    countryId: 3,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  // --- Germany (countryId: 4) ---
  {
    id: 10,
    name: 'Berlin',
    countryId: 4,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 11,
    name: 'Munich',
    countryId: 4,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 12,
    name: 'Hamburg',
    countryId: 4,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  // --- Japan (countryId: 5) ---
  {
    id: 13,
    name: 'Tokyo',
    countryId: 5,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 14,
    name: 'Osaka',
    countryId: 5,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 15,
    name: 'Kyoto',
    countryId: 5,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  // --- Australia (countryId: 6) ---
  {
    id: 16,
    name: 'Sydney',
    countryId: 6,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 17,
    name: 'Melbourne',
    countryId: 6,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 18,
    name: 'Brisbane',
    countryId: 6,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  // --- India (countryId: 7) ---
  {
    id: 19,
    name: 'Mumbai',
    countryId: 7,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 20,
    name: 'Delhi',
    countryId: 7,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 21,
    name: 'Bangalore',
    countryId: 7,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  // --- Vietnam (countryId: 8) ---
  {
    id: 22,
    name: 'Ho Chi Minh City',
    countryId: 8,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 23,
    name: 'Hanoi',
    countryId: 8,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 24,
    name: 'Da Nang',
    countryId: 8,
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
];
