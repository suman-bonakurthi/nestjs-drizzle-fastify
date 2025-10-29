export class Language {
  id?: number;
  countryId: number;
  name: string;
  code: string;
  native: string;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}
