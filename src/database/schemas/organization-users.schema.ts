import { relations } from 'drizzle-orm';
import { integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { organizations, users } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const organizationUsers = pgTable(
  'organization_users',
  {
    organizationId: integer()
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.userId],
    }),
  ],
);

export const organizationUsersRelations = relations(
  organizationUsers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationUsers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationUsers.userId],
      references: [users.id],
    }),
  }),
);
