import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  smallserial,
  text,
} from 'drizzle-orm/pg-core';
import {
  currencies,
  languages,
  organizations,
} from '../../database/schemas/schema';
import { cities } from './cities.schema';
import timestamps from './columns.helper';

export const countries = pgTable(
  'countries',
  {
    id: smallserial().primaryKey(),
    name: text().notNull(),
    iso: text().unique().notNull(),
    flag: text().notNull(),
    currencyId: integer()
      .notNull()
      .references(() => currencies.id),
    ...timestamps,
  },
  (table) => [
    index('country_created_at_idx').on(table.createdAt),
    index('country_name_idx').on(table.name),
    index('country_iso_idx').on(table.iso),
  ],
);

export const countriesRelations = relations(countries, ({ one, many }) => ({
  cities: many(cities),
  organizations: many(organizations),
  languages: many(languages),
  currency: one(currencies, {
    fields: [countries.currencyId],
    references: [currencies.id],
  }),
}));
