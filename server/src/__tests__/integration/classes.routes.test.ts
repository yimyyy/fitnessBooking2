import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/client';

jest.mock('../../prisma/client', () => ({
  prisma: {
    class: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeToken(role: string) {
  process.env.JWT_SECRET = 'test-secret';
  return jwt.sign({ id: 'user-1', email: 'test@test.com', role }, 'test-secret');
}

const mockClass = {
  id: 'class-1', title: 'Yoga', description: 'Morning yoga',
  instructorId: 'instr-1', instructor: { id: 'instr-1', name: 'Jane', email: 'jane@test.com' },
  startTime: new Date().toISOString(), endTime: new Date().toISOString(),
  capacity: 10, price: 20, location: 'Room A',
  isRecurring: false, recurrenceRule: null, parentClassId: null,
  status: 'upcoming', createdAt: new Date().toISOString(),
  _count: { bookings: 0 },
};

describe('Classes routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/classes', () => {
    it('returns 200 with upcoming class list (default)', async () => {
      (mockPrisma.class.findMany as jest.Mock).mockResolvedValue([mockClass]);
      const res = await request(app).get('/api/v1/classes');
      expect(res.status).toBe(200);
      expect(res.body.classes).toHaveLength(1);
      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ startTime: expect.objectContaining({ gte: expect.any(Date) }) }),
        })
      );
    });

    it('returns past classes when view=past', async () => {
      (mockPrisma.class.findMany as jest.Mock).mockResolvedValue([mockClass]);
      const res = await request(app).get('/api/v1/classes?view=past');
      expect(res.status).toBe(200);
      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ startTime: expect.objectContaining({ lte: expect.any(Date) }) }),
          orderBy: { startTime: 'desc' },
        })
      );
    });

    it('returns all classes with no time filter when view=all', async () => {
      (mockPrisma.class.findMany as jest.Mock).mockResolvedValue([mockClass]);
      const res = await request(app).get('/api/v1/classes?view=all');
      expect(res.status).toBe(200);
      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('POST /api/v1/classes', () => {
    const classData = {
      title: 'Yoga', instructorId: 'instr-1',
      startTime: new Date().toISOString(), endTime: new Date().toISOString(),
      capacity: 10, price: 20, location: 'Room A',
    };

    it('returns 201 for admin', async () => {
      (mockPrisma.class.create as jest.Mock).mockResolvedValue(mockClass);
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${makeToken('admin')}`)
        .send(classData);
      expect(res.status).toBe(201);
    });

    it('returns 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${makeToken('student')}`)
        .send(classData);
      expect(res.status).toBe(403);
    });

    it('accepts recurrenceEndDate and passes it to the service', async () => {
      (mockPrisma.class.create as jest.Mock).mockResolvedValue(mockClass);
      const endDate = '2027-12-31T00:00:00Z';
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${makeToken('admin')}`)
        .send({ ...classData, isRecurring: true, recurrenceRule: 'MO,WE', recurrenceEndDate: endDate });
      expect(res.status).toBe(201);
      expect(mockPrisma.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recurrenceEndDate: new Date(endDate) }),
        })
      );
    });

    it('returns 400 when recurrenceEndDate is not a valid datetime', async () => {
      const res = await request(app)
        .post('/api/v1/classes')
        .set('Authorization', `Bearer ${makeToken('admin')}`)
        .send({ ...classData, recurrenceEndDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/classes/:id/cancel', () => {
    it('returns 200 with cancelled class for admin', async () => {
      const cancelled = { ...mockClass, status: 'cancelled' };
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.class.update as jest.Mock).mockResolvedValue(cancelled);
      const res = await request(app)
        .patch('/api/v1/classes/class-1/cancel')
        .set('Authorization', `Bearer ${makeToken('admin')}`);
      expect(res.status).toBe(200);
      expect(res.body.class.status).toBe('cancelled');
    });

    it('returns 403 for student', async () => {
      const res = await request(app)
        .patch('/api/v1/classes/class-1/cancel')
        .set('Authorization', `Bearer ${makeToken('student')}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 for instructor', async () => {
      const res = await request(app)
        .patch('/api/v1/classes/class-1/cancel')
        .set('Authorization', `Bearer ${makeToken('instructor')}`);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/classes/:id', () => {
    it('returns 204 for admin', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.class.delete as jest.Mock).mockResolvedValue(mockClass);
      const res = await request(app)
        .delete('/api/v1/classes/class-1')
        .set('Authorization', `Bearer ${makeToken('admin')}`);
      expect(res.status).toBe(204);
    });

    it('returns 403 for student', async () => {
      const res = await request(app)
        .delete('/api/v1/classes/class-1')
        .set('Authorization', `Bearer ${makeToken('student')}`);
      expect(res.status).toBe(403);
    });
  });
});
