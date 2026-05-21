// Global test setup — runs before each test suite
// Unit tests mock prisma individually; this file avoids instantiating a real connection
jest.mock('../prisma/client', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    class: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    booking: {
      findFirst: jest.fn(), count: jest.fn(), create: jest.fn(),
      findMany: jest.fn(), update: jest.fn(), findUnique: jest.fn(),
    },
    notification: { create: jest.fn() },
    $disconnect: jest.fn(),
  },
}));

afterAll(async () => {
  jest.clearAllMocks();
});
