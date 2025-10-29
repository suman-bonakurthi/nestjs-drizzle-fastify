import {
  index,
  integer,
  pgTable,
  smallserial,
  text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm/relations';
import { countries } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const languages = pgTable(
  'languages',
  {
    id: smallserial().primaryKey(),
    countryId: integer()
      .notNull()
      .references(() => countries.id),
    name: text().notNull(),
    code: text().unique().notNull(),
    native: text().notNull(),
    ...timestamps,
  },
  (table) => [
    index('language_created_at_idx').on(table.createdAt),
    index('language_name_idx').on(table.name),
    index('language_code_idx').on(table.code),
    index('language_native_idx').on(table.native),
  ],
);

export const languagesRelations = relations(languages, ({ one }) => ({
  country: one(countries, {
    fields: [languages.countryId],
    references: [countries.id],
  }),
}));
