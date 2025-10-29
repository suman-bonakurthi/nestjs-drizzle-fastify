// Define the type for the data structure to ensure type safety with Drizzle insertions
type organizationLocations = {
  organizationId: number;
  locationId: number;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date;
  id?: number;
};

// const COUNT = 50;

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const OrganizationLocationsSeedData: organizationLocations[] =
  Array.from({ length: 50 }, (_, i) => {
    return {
      organizationId: i + 1,
      locationId: i + 1,
      updatedAt: new Date(),
      createdAt: new Date(),
      deletedAt: undefined,
    };
  });
