import { relations } from 'drizzle-orm';
import { index, integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import timestamps from './columns.helper';
import { contacts } from './contacts.schema';
import { countries } from './countries.schema';
import { organizationLocations } from './organization-locations.schema';
import { organizationUsers } from './organization-users.schema';

export const organizations = pgTable(
  'organizations',
  {
    id: serial().primaryKey(),
    countryId: integer()
      .notNull()
      .references(() => countries.id),
    name: text().notNull(),
    phone: text().unique().notNull(),
    email: text().notNull(),
    url: text(),
    ...timestamps,
  },
  (table) => [
    index('entity_created_at_idx').on(table.createdAt),
    index('entity_name_idx').on(table.name),
    index('entity_phone_idx').on(table.phone),
    index('entity_email_idx').on(table.email),
  ],
);

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    contact: one(contacts),
    country: one(countries, {
      fields: [organizations.countryId],
      references: [countries.id],
    }),
    locations: many(organizationLocations),
    users: many(organizationUsers),
  }),
);
