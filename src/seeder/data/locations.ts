import { faker } from '@faker-js/faker';
import { Location } from '../../locations/entities/location.entity';

const COUNT = 100;

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const LocationsSeedData: Location[] = Array.from(
  { length: COUNT },
  (_, i) => {
    return {
      id: i + 1,
      title: faker.company.name(),
      address: faker.location.streetAddress(),
      cityId: faker.number.int({ min: 1, max: 24 }),
      postalCode: faker.location.zipCode(),
      isPrimary: faker.datatype.boolean(),
      updatedAt: new Date(),
      createdAt: new Date(),
      deletedAt: undefined,
    };
  },
);
