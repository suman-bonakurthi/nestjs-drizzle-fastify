import { timestamp } from 'drizzle-orm/pg-core/columns/timestamp'

const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().notNull(),
  deletedAt: timestamp(),
}
export default timestamps
