import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { createClass, getClasses, getClassById, updateClass, deleteClass } from '../services/classService';

export const classesRouter = Router();

const createClassSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  instructorId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  capacity: z.number().int().positive(),
  price: z.number().nonnegative(),
  location: z.string().min(1),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  recurrenceEndDate: z.string().datetime().optional(),
  parentClassId: z.string().optional(),
});

classesRouter.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const isPast = req.query.view === 'past';
    const classes = await getClasses(
      isPast ? { to: now, orderDesc: true } : { from: now }
    );
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

classesRouter.get('/:id', async (req, res, next) => {
  try {
    const cls = await getClassById(String(req.params.id));
    res.json({ class: cls });
  } catch (err) {
    next(err);
  }
});

classesRouter.post('/', authenticate, requireRole('admin', 'instructor'), async (req: AuthRequest, res, next) => {
  try {
    const { startTime, endTime, recurrenceEndDate, ...rest } = createClassSchema.parse(req.body);
    const cls = await createClass({
      ...rest,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      ...(recurrenceEndDate && { recurrenceEndDate: new Date(recurrenceEndDate) }),
    });
    res.status(201).json({ class: cls });
  } catch (err) {
    next(err);
  }
});

classesRouter.put('/:id', authenticate, requireRole('admin', 'instructor'), async (req, res, next) => {
  try {
    const data = createClassSchema.partial().parse(req.body);
    const { startTime, endTime, recurrenceEndDate, ...rest } = data;
    const updated = await updateClass(String(req.params.id), {
      ...rest,
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      ...(recurrenceEndDate && { recurrenceEndDate: new Date(recurrenceEndDate) }),
    });
    res.json({ class: updated });
  } catch (err) {
    next(err);
  }
});

classesRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await deleteClass(String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
