import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  smallserial,
  text,
} from 'drizzle-orm/pg-core';
import { countries, locations } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const cities = pgTable(
  'cities',
  {
    id: smallserial().primaryKey(),
    name: text().notNull(),
    countryId: integer()
      .notNull()
      .references(() => countries.id),
    ...timestamps,
  },
  (table) => [
    index('city_created_at_idx').on(table.createdAt),
    index('city_name_idx').on(table.name),
  ],
);

export const citiesRelations = relations(cities, ({ one, many }) => ({
  country: one(countries, {
    fields: [cities.countryId],
    references: [countries.id],
  }),
  locations: many(locations),
}));
