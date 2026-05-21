import { register, login } from '../../services/authService';
import { prisma } from '../../prisma/client';
import { ConflictError, UnauthorizedError } from '../../errors/AppError';
import bcrypt from 'bcryptjs';

jest.mock('../../prisma/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('authService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('creates user with hashed password', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: '1', name: 'Alice', email: 'alice@example.com', role: 'student', language: 'en', createdAt: new Date(),
      });

      const user = await register({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
      expect(user.email).toBe('alice@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('throws ConflictError on duplicate email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'alice@example.com' });
      await expect(register({ name: 'Alice', email: 'alice@example.com', password: 'password123' }))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('returns JWT on valid credentials', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'alice@example.com', passwordHash: 'hashed', role: 'student', name: 'Alice', language: 'en',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      process.env.JWT_SECRET = 'test-secret';

      const result = await login({ email: 'alice@example.com', password: 'password123' });
      expect(result.token).toBeDefined();
    });

    it('throws UnauthorizedError on wrong password', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'alice@example.com', passwordHash: 'hashed', role: 'student',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(login({ email: 'alice@example.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});
