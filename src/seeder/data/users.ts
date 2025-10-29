import { faker } from '@faker-js/faker';
import { User } from '../../users/entities/user.entity';
import { userIds } from './userIds';

// Define the type for the data structure to ensure type safety with Drizzle insertion
// const COUNT = 50;

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */

export const UserSeedData: User[] = Array.from({ length: 50 }, (_, i) => {
  return {
    id: userIds[i],
    userName: faker.company.name(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  };
});
