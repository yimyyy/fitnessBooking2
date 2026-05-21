import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../prisma/client';

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
