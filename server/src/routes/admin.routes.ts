import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { getAllSettings, setSetting } from '../services/settingsService';
import { createBooking } from '../services/bookingService';
import { ForbiddenError } from '../errors/AppError';
import { getLogs } from '../services/logService';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('admin'));

// Get all users
adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, language: true, createdAt: true,
        _count: { select: { bookings: true } },
      },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// Get all bookings for a class
adminRouter.get('/classes/:classId/bookings', async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { classId: String(req.params.classId) },
      include: {
        user: { select: { id: true, name: true, email: true } },
        class: { select: { title: true, startTime: true } },
      },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

// Update payment status
adminRouter.patch('/bookings/:id/payment', async (req, res, next) => {
  try {
    const { paymentStatus, paymentRef } = req.body;
    const booking = await prisma.booking.update({
      where: { id: String(req.params.id) },
      data: { paymentStatus, paymentRef },
    });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

// Dashboard stats
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [totalBookings, totalRevenue, classCount] = await Promise.all([
      prisma.booking.count({ where: { status: 'confirmed' } }),
      prisma.booking.aggregate({
        where: { status: 'confirmed', paymentStatus: 'paid' },
        _sum: { paymentAmount: true },
      }),
      prisma.class.count(),
    ]);

    res.json({
      totalBookings,
      totalRevenue: totalRevenue._sum.paymentAmount || 0,
      classCount,
    });
  } catch (err) {
    next(err);
  }
});

// Get all app settings
adminRouter.get('/settings', async (_req, res, next) => {
  try {
    const settings = await getAllSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// Update an app setting
adminRouter.put('/settings', async (req, res, next) => {
  try {
    const { key, value } = z.object({
      key: z.string().min(1),
      value: z.string(),
    }).parse(req.body);
    await setSetting(key, value);
    const settings = await getAllSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// Get all bookings for a specific user
adminRouter.get('/users/:userId/bookings', async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: String(req.params.userId) },
      include: {
        class: { include: { instructor: { select: { id: true, name: true } } } },
      },
      orderBy: { bookedAt: 'desc' },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

// Book a class on behalf of a user (admin cannot book for themselves)
adminRouter.post('/bookings', async (req: AuthRequest, res, next) => {
  try {
    const { userId, classId } = z.object({
      userId: z.string().min(1),
      classId: z.string().min(1),
    }).parse(req.body);
    if (userId === req.user!.id) {
      return next(new ForbiddenError('Admins cannot book classes for themselves.'));
    }
    const booking = await createBooking(userId, classId);
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
});

// Manually promote waitlisted user
adminRouter.patch('/bookings/:id/promote', async (req, res, next) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: String(req.params.id) },
      data: { status: 'confirmed' },
    });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

// Update user role
adminRouter.patch('/users/:userId/role', async (req, res, next) => {
  try {
    const { role } = z.object({
      role: z.enum(['admin', 'instructor', 'student']),
    }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: String(req.params.userId) },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/logs', (_req, res) => {
  res.json({ logs: getLogs() });
});
