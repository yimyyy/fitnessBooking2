import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma/client';

jest.mock('../../prisma/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auth routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/auth/register', () => {
    it('returns 201 on success', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: '1', name: 'Alice', email: 'alice@test.com', role: 'student', language: 'en', createdAt: new Date(),
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Alice', email: 'alice@test.com', password: 'password123',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('alice@test.com');
    });

    it('returns 409 on duplicate email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'alice@test.com' });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Alice', email: 'alice@test.com', password: 'password123',
      });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 and JWT on success', async () => {
      const bcrypt = require('bcryptjs');
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'alice@test.com', passwordHash: 'hashed', role: 'student', name: 'Alice', language: 'en',
      });
      bcrypt.compare.mockResolvedValue(true);
      process.env.JWT_SECRET = 'test-secret';

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'alice@test.com', password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('returns 401 on bad credentials', async () => {
      const bcrypt = require('bcryptjs');
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'alice@test.com', passwordHash: 'hashed', role: 'student',
      });
      bcrypt.compare.mockResolvedValue(false);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'alice@test.com', password: 'wrong',
      });
      expect(res.status).toBe(401);
    });
  });
});
