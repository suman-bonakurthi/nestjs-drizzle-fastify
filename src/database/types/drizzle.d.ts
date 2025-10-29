import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { schema } from '../schemas/schema'
export type DrizzleDatabase = NodePgDatabase<typeof schema>
