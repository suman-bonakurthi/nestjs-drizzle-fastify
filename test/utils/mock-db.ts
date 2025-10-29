// src/test/utils/mock-db.ts
export const createMockQueryBuilder = (initialResult: any[] = []) => {
  const qb: any = {
    _mockResult: initialResult,

    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),

    returning: jest.fn(function (this: any) {
      return Promise.resolve(this._mockResult);
    }),

    then: jest.fn(function (this: any, resolve) {
      return resolve(this._mockResult);
    }),
  };

  return qb;
};

export const createMockDb = (initialResult: any[] = []) => {
  const mockQueryBuilder = createMockQueryBuilder(initialResult);

  const db = {
    select: jest.fn(() => mockQueryBuilder),
    insert: jest.fn(() => mockQueryBuilder),
    update: jest.fn(() => mockQueryBuilder),
    delete: jest.fn(() => mockQueryBuilder),

    transaction: jest.fn(async (callback) => callback(db)),

    query: {
      cities: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      countries: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      organizations: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      contacts: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      locations: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      users: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      currencies: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      languages: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
  };

  return { db, mockQueryBuilder };
};

export const mockQueryBuilder: any = {
  _mockResult: [],
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(function (this: any) {
    return Promise.resolve(this._mockResult);
  }),
  then: jest.fn(function (this: any, resolve) {
    return resolve(this._mockResult);
 }),
};

/**
 * ✅ Mock Drizzle database
 */
export const mockDb: any = {
  select: jest.fn(() => mockQueryBuilder),
  insert: jest.fn(() => mockQueryBuilder),
  update: jest.fn(() => mockQueryBuilder),
  delete: jest.fn(() => mockQueryBuilder),
  transaction: jest.fn(async (cb) => cb(mockDb)),
  query: {
    cities: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    countries: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    organizations: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    contacts: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    locations: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    users: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    currencies: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    languages: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
};

// 🧠 Ensure all chainable methods return the same builder (in case of reassignments)
Object.keys(mockQueryBuilder).forEach((key) => {
 if (
    typeof mockQueryBuilder[key] === 'function' &&
    key !== 'then' &&
    key !== 'returning'
  ) {
    mockQueryBuilder[key].mockReturnValue(mockQueryBuilder);
  }
});
