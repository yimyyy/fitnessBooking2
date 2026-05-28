import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/client';

jest.mock('../../prisma/client', () => ({
  prisma: {
    class: { findUnique: jest.fn(), update: jest.fn() },
    booking: {
      findFirst: jest.fn(), count: jest.fn(), create: jest.fn(),
      findMany: jest.fn(), update: jest.fn(), findUnique: jest.fn(),
    },
    notification: { create: jest.fn() },
    appSettings: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
  },
}));

jest.mock('../../services/sesEmailService', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
  sendCancellationConfirmation: jest.fn().mockResolvedValue(undefined),
  sendWaitlistPromotion: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeToken(role = 'student', id = 'user-1') {
  process.env.JWT_SECRET = 'test-secret';
  return jwt.sign({ id, email: 'test@test.com', role }, 'test-secret');
}

const mockClass = {
  id: 'class-1', title: 'Yoga', capacity: 10, price: 20, status: 'upcoming',
  startTime: new Date(Date.now() + 48 * 3600000),
  endTime: new Date(Date.now() + 49 * 3600000),
  location: 'Room A', instructor: { id: 'instr-1', name: 'Jane', email: 'jane@test.com' },
};

const mockUser = { id: 'user-1', name: 'Alice', email: 'alice@test.com', language: 'en' };

describe('Bookings routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/bookings', () => {
    it('returns 201 confirmed when spots available', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'b-1', userId: 'user-1', classId: 'class-1', status: 'confirmed',
        user: mockUser, class: mockClass,
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ classId: 'class-1' });
      expect(res.status).toBe(201);
      expect(res.body.booking.status).toBe('confirmed');
    });

    it('returns 201 waitlisted when class full', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'b-2', userId: 'user-1', classId: 'class-1', status: 'waitlisted',
        user: mockUser, class: mockClass,
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ classId: 'class-1' });
      expect(res.status).toBe(201);
      expect(res.body.booking.status).toBe('waitlisted');
    });
  });

  describe('DELETE /api/v1/bookings/:id', () => {
    it('returns 204 on cancel', async () => {
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b-1', userId: 'user-1', classId: 'class-1', status: 'confirmed',
        user: mockUser, class: { ...mockClass, startTime: new Date(Date.now() + 48 * 3600000) },
      });
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b-1', status: 'cancelled' });
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/bookings/b-1')
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(204);
    });
  });

  describe('GET /api/v1/bookings/my', () => {
    it('returns current user bookings', async () => {
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([
        { id: 'b-1', userId: 'user-1', status: 'confirmed', class: mockClass },
      ]);

      const res = await request(app)
        .get('/api/v1/bookings/my')
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.bookings).toHaveLength(1);
    });
  });
});
