export class Contact {
  id?: number;
  organizationId: number;
  fullName: string;
  phone: string;
  email: string;
  title: string;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}
