import { and, asc, desc, eq, ilike, or, SQL } from 'drizzle-orm'

export function buildQueryOptions(table: any, filter: any = {}) {
  const whereClauses: any[] = []
  const orClauses: any[] = []

  const whereFilters = filter?.where || {}
  const orFilters = filter?.or || {}
  const order = filter?.order || {}
  const pagination = filter?.pagination || {}

  // --- WHERE (AND) filters ---
  for (const [key, value] of Object.entries(whereFilters)) {
    if (!value) continue
    if (typeof value === 'string' && value.includes('%')) {
      whereClauses.push(ilike(table[key], value)) // partial match
    } else {
      whereClauses.push(eq(table[key], value))
    }
  }

  // --- OR filters ---
  for (const [key, value] of Object.entries(orFilters)) {
    if (!value) continue
    if (typeof value === 'string' && value.includes('%')) {
      orClauses.push(ilike(table[key], value))
    } else {
      orClauses.push(eq(table[key], value))
    }
  }

  // --- Combine conditions ---
  let whereCondition: any = undefined
  if (whereClauses.length && orClauses.length)
    whereCondition = and(...whereClauses, or(...orClauses))
  else if (whereClauses.length) whereCondition = and(...whereClauses)
  else if (orClauses.length) whereCondition = or(...orClauses)

  // --- Sorting ---
  const orderByClause: SQL[] = []
  if (order?.by) {
    const direction =
      order?.dir === 'desc' ? desc(table[order.by]) : asc(table[order.by])
    orderByClause.push(direction)
  }

  // --- Pagination ---
  const limit = Number(pagination?.limit) || 10
  const offset = Number(pagination?.offset) || 0

  return { whereCondition, orderByClause, limit, offset }
}
