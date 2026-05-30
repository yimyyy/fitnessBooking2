import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/client';

jest.mock('../../prisma/client', () => ({
  prisma: {
    user: { findMany: jest.fn() },
    class: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    booking: {
      findFirst: jest.fn(), count: jest.fn(), create: jest.fn(),
      findMany: jest.fn(), update: jest.fn(),
    },
    appSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../../services/sesEmailService', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
  sendCancellationConfirmation: jest.fn().mockResolvedValue(undefined),
  sendWaitlistPromotion: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeToken(role = 'admin', id = 'admin-1') {
  process.env.JWT_SECRET = 'test-secret';
  return jwt.sign({ id, email: 'admin@test.com', role }, 'test-secret');
}

const mockClass = {
  id: 'class-1', title: 'Yoga', capacity: 10, price: 20, status: 'upcoming',
  startTime: new Date(Date.now() + 48 * 3600000),
  endTime: new Date(Date.now() + 49 * 3600000),
  location: 'Room A',
  instructor: { id: 'instr-1', name: 'Jane', email: 'jane@test.com' },
};

const mockUser = { id: 'user-1', name: 'Alice', email: 'alice@test.com', language: 'en' };

describe('Admin routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/admin/bookings', () => {
    it('returns 201 when admin books on behalf of a user', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(3);
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'b-1', userId: 'user-1', classId: 'class-1', status: 'confirmed',
        user: mockUser, class: mockClass,
      });

      const res = await request(app)
        .post('/api/v1/admin/bookings')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ userId: 'user-1', classId: 'class-1' });
      expect(res.status).toBe(201);
      expect(res.body.booking.status).toBe('confirmed');
    });

    it('returns 403 when admin tries to book for themselves', async () => {
      const res = await request(app)
        .post('/api/v1/admin/bookings')
        .set('Authorization', `Bearer ${makeToken('admin', 'admin-1')}`)
        .send({ userId: 'admin-1', classId: 'class-1' });
      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/admin/bookings')
        .send({ userId: 'user-1', classId: 'class-1' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const res = await request(app)
        .post('/api/v1/admin/bookings')
        .set('Authorization', `Bearer ${makeToken('student', 'user-1')}`)
        .send({ userId: 'user-2', classId: 'class-1' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/users/:userId/bookings', () => {
    it('returns bookings for the specified user', async () => {
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([
        { id: 'b-1', userId: 'user-1', status: 'confirmed', paymentStatus: 'pending', class: mockClass },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/users/user-1/bookings')
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.bookings).toHaveLength(1);
    });

    it('returns 403 for non-admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users/user-1/bookings')
        .set('Authorization', `Bearer ${makeToken('student', 'user-1')}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/bookings/:id/payment', () => {
    it('updates payment status', async () => {
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({
        id: 'b-1', paymentStatus: 'paid',
      });

      const res = await request(app)
        .patch('/api/v1/admin/bookings/b-1/payment')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ paymentStatus: 'paid' });
      expect(res.status).toBe(200);
      expect(res.body.booking.paymentStatus).toBe('paid');
    });
  });
});
