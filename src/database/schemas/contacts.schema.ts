import { relations } from 'drizzle-orm';
import { index, integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { organizations } from '../../database/schemas/schema';
import timestamps from './columns.helper';

export const contacts = pgTable(
  'contacts',
  {
    id: serial().primaryKey(),
    organizationId: integer()
      .notNull()
      .references(() => organizations.id),
    fullName: text().notNull(),
    title: text().unique().notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    ...timestamps,
  },
  (table) => [
    index('organization_created_at_idx').on(table.createdAt),
    index('organization_name_idx').on(table.fullName),
    index('organization_phone_idx').on(table.phone),
    index('organization_email_idx').on(table.email),
  ],
);

export const contactsRelations = relations(contacts, ({ one }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
}));
