export interface Seeder {
  /**
   * The main seeding logic.
   */
  seed(): Promise<void>;
}
