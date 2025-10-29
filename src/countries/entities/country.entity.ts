export class Country {
  id?: number;
  name: string;
  iso: string;
  flag: string;
  currencyId: number;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}
