export class Currency {
  id?: number;
  name: string;
  code: string;
  symbol: string;
  updatedAt: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}
