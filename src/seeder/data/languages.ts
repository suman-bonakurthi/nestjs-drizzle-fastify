import { Language } from '../../languages/entities/language.entity';

/**
 * Generates an array of 50 fake entity records using faker-js.
 * * Note: Drizzle will automatically generate 'id' and 'createdAt/updatedAt'
 * if you use the 'serial()' and 'defaultNow()' functions in your schema.
 */
export const LanguageSeedData: Language[] = [
  {
    id: 1,
    countryId: 1, // Placeholder
    name: 'English',
    code: 'en',
    native: 'English',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 2,
    countryId: 2, // Placeholder
    name: 'English',
    code: 'en',
    native: 'English',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 3,
    countryId: 3, // Placeholder
    name: 'English',
    code: 'en',
    native: 'English',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 4,
    countryId: 6, // Placeholder
    name: 'English',
    code: 'en',
    native: 'English',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  {
    id: 5,
    countryId: 4, // Placeholder
    name: 'German',
    code: 'de',
    native: 'Deutsch',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 6,
    countryId: 5,
    name: 'Japanese',
    code: 'ja',
    native: '日本語', // Nihongo
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 7,
    countryId: 1, // Placeholder
    name: 'Mandarin Chinese',
    code: 'zh',
    native: '汉语',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  {
    id: 8,
    countryId: 7, // Placeholder
    name: 'Hindi',
    code: 'hi',
    native: 'हिन्दी',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },

  {
    id: 9,
    countryId: 8, // Placeholder
    name: 'Vietnamese',
    code: 'vi',
    native: 'Tiếng Việt',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
  {
    id: 10,
    countryId: 9, // Placeholder: Assumes China's country ID is 6
    name: 'Mandarin Chinese',
    code: 'zh',
    native: '汉语',
    updatedAt: new Date(),
    createdAt: new Date(),
    deletedAt: undefined,
  },
];
