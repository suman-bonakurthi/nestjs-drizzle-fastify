import { faker } from '@faker-js/faker';
import { Organization } from '../../organizations/entities/organization.entity';

// Define the type for the data structure to ensure type safety with Drizzle insertion
const COUNT = 50;

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const OrganizationSeedData: Organization[] = Array.from(
  { length: COUNT },
  (_, i) => {
    return {
      id: i + 1,
      countryId: faker.number.int({ min: 1, max: 9 }),
      name: faker.company.name(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      url: faker.internet.url(),
      updatedAt: new Date(),
      createdAt: new Date(),
      deletedAt: undefined,
    };
  },
);
