import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  smallserial,
  text,
} from 'drizzle-orm/pg-core';
import { cities, organizationLocations } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const locations = pgTable(
  'locations',
  {
    id: smallserial().primaryKey(),
    address: text().notNull(),
    title: text().notNull(),
    cityId: integer()
      .notNull()
      .references(() => cities.id, { onDelete: 'cascade' }),
    postalCode: text().notNull(),
    isPrimary: boolean().default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index('locations_is_primary_idx').on(table.isPrimary),
    index('locations_postal_code_idx').on(table.postalCode),
  ],
);

export const locationsRelations = relations(locations, ({ one, many }) => ({
  city: one(cities, {
    fields: [locations.cityId],
    references: [cities.id],
  }),
  organizations: many(organizationLocations),
}));
