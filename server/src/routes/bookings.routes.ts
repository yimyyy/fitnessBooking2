import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createBooking, cancelBooking, getUserBookings } from '../services/bookingService';
import { getSetting } from '../services/settingsService';

export const bookingsRouter = Router();

bookingsRouter.get('/my', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const bookings = await getUserBookings(req.user!.id);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { classId } = req.body;
    const booking = await createBooking(req.user!.id, classId);
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const windowHours = parseInt(await getSetting('cancellationWindowHours'), 10);
    await cancelBooking(String(req.params.id), req.user!.id, windowHours);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
