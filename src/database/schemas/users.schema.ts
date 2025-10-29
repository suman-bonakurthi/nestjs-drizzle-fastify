import { relations } from 'drizzle-orm';
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { organizationUsers } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    userName: text().unique().notNull(),
    email: text().unique().notNull(),
    password: text().notNull(),
    ...timestamps,
  },
  (table) => [index('users_created_at_idx').on(table.createdAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizationUsers),
}));
