import { userIds } from './userIds';

// Define the type for the data structure to ensure type safety with Drizzle insertions
type organizationUsers = {
  organizationId: number;
  userId: string;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date;
  id?: number;
};

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const OrganizationUsersSeedData: organizationUsers[] = Array.from(
  { length: 50 },
  (_, i) => {
    return {
      organizationId: i + 1,
      userId: userIds[i],
      updatedAt: new Date(),
      createdAt: new Date(),
      deletedAt: undefined,
    };
  },
);
