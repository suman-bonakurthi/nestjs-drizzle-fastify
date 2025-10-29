import { integer, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm/relations';
import { locations, organizations } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const organizationLocations = pgTable(
  'organization_locations',
  {
    organizationId: integer()
      .notNull()
      .references(() => organizations.id),
    locationId: integer()
      .notNull()
      .references(() => locations.id),
    ...timestamps,
    // Note: You defined primaryKey twice in the original, keeping the standard format
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.locationId],
    }),
  ],
);

export const organizationLocationsRelations = relations(
  organizationLocations,
  ({ one }) => ({
    // Relation back to the Organization
    organization: one(organizations, {
      fields: [organizationLocations.organizationId],
      references: [organizations.id],
    }),

    // Relation back to the Location (FIXED NAME)
    location: one(locations, {
      fields: [organizationLocations.locationId],
      references: [locations.id],
    }),
  }),
);
