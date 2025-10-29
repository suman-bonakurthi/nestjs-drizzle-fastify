import { faker } from '@faker-js/faker';
import { Contact } from '../../contacts/entities/contact.entity';

// Define the type for the data structure to ensure type safety with Drizzle insertions

const COUNT = 50;

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const ContactsSeedData: Contact[] = Array.from(
  { length: COUNT },
  (_, i) => {
    return {
      id: i + 1,
      organizationId: i + 1,
      fullName: faker.person.firstName() + ' ' + faker.person.lastName(),
      title: faker.person.jobTitle(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      updatedAt: new Date(),
      createdAt: new Date(),
      deletedAt: undefined,
    };
  },
);
