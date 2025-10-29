import { Currency } from '../../currencies/entities/currency.entity';

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const CurrencySeedData: Currency[] = [
  {
    id: 1,
    name: 'United States Dollar',
    code: 'USD',
    symbol: '$',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 2,
    name: 'Euro',
    code: 'EUR',
    symbol: '€',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 3,
    name: 'Great British Pound',
    code: 'GBP',
    symbol: '£',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 4,
    name: 'Japanese Yen',
    code: 'JPY',
    symbol: '¥',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 5,
    name: 'Canadian Dollar',
    code: 'CAD',
    symbol: 'C$',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 6,
    name: 'Australian Dollar',
    code: 'AUD',
    symbol: 'A$',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 7,
    name: 'Indian Rupee',
    code: 'INR',
    symbol: '₹',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 8,
    name: 'Vietnamese Đồng',
    code: 'VND',
    symbol: '₫',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 9,
    name: 'Chinese Yuan',
    code: 'CNY',
    symbol: '¥',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
];
