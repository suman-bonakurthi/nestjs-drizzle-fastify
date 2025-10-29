export class Location {
  id?: number;
  address: string;
  title: string;
  postalCode: string;
  isPrimary: boolean;
  cityId: number;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}
