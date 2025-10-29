export class User {
  id?: string;
  userName: string;
  email: string;
  password: string;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}
