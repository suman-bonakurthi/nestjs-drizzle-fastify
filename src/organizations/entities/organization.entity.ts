export class Organization {
  id: number;
  countryId: number;
  name: string;
  phone: string;
  email: string;
  url: string | null;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}
