export class DBNotFoundException extends Error {
  constructor(
    entity: string,
    criteria?: Record<string, string | number | boolean | null>,
  ) {
    const details = criteria ? ` with ${JSON.stringify(criteria)}` : '';
    super(`${entity}${details} not found`);
    this.name = 'DBNotFoundException';
  }
}
