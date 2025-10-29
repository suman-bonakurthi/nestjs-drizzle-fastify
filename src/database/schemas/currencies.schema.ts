import { relations } from 'drizzle-orm';
import { index, pgTable, smallserial, text } from 'drizzle-orm/pg-core';
import { countries } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const currencies = pgTable(
  'currencies',
  {
    id: smallserial().primaryKey(),
    name: text().notNull(),
    code: text().unique().notNull(),
    symbol: text().notNull(),
    ...timestamps,
  },
  (table) => [
    index('currency_created_at_idx').on(table.createdAt),
    index('currency_name_idx').on(table.name),
    index('currency_code_idx').on(table.code),
  ],
);

export const currenciesRelations = relations(currencies, ({ one }) => ({
  country: one(countries),
}));
