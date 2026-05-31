import { prisma } from '../prisma/client';
import { NotFoundError } from '../errors/AppError';
import { ClassStatus } from '@prisma/client';

const DAY_ABBR: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function buildRecurringInstances(parent: {
  id: string; title: string; description: string | null; instructorId: string;
  startTime: Date | string; endTime: Date | string; capacity: number; price: number; location: string;
  recurrenceRule: string | null; recurrenceEndDate: Date | string | null;
}): Omit<CreateClassInput, 'isRecurring'>[] {
  if (!parent.recurrenceRule || !parent.recurrenceEndDate) return [];
  const targetDays = parent.recurrenceRule
    .split(',').map(d => DAY_ABBR[d.trim()]).filter((d): d is number => d !== undefined);
  if (targetDays.length === 0) return [];

  const startTime = new Date(parent.startTime);
  const endTime = new Date(parent.endTime);
  const endDate = new Date(parent.recurrenceEndDate);

  const duration = endTime.getTime() - startTime.getTime();
  // Time-of-day offset in ms from midnight UTC
  const midnight = new Date(startTime);
  midnight.setUTCHours(0, 0, 0, 0);
  const timeOfDay = startTime.getTime() - midnight.getTime();

  const instances: Omit<CreateClassInput, 'isRecurring'>[] = [];
  const cursor = new Date(midnight);
  cursor.setUTCDate(cursor.getUTCDate() + 1); // start from the day after the parent

  while (cursor.getTime() <= endDate.getTime()) {
    if (targetDays.includes(cursor.getUTCDay())) {
      const start = new Date(cursor.getTime() + timeOfDay);
      instances.push({
        title: parent.title,
        description: parent.description ?? undefined,
        instructorId: parent.instructorId,
        startTime: start,
        endTime: new Date(start.getTime() + duration),
        capacity: parent.capacity,
        price: parent.price,
        location: parent.location,
        parentClassId: parent.id,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return instances;
}

interface CreateClassInput {
  title: string;
  description?: string;
  instructorId: string;
  startTime: Date;
  endTime: Date;
  capacity: number;
  price: number;
  location: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  recurrenceEndDate?: Date;
  parentClassId?: string;
}

interface UpdateClassInput extends Partial<CreateClassInput> {
  status?: ClassStatus;
}

/**
 * Creates a new fitness class.
 * @param data - Class creation data
 * @returns Created class record
 * @example
 * const cls = await createClass({ title: 'Yoga', instructorId: 'user-1', startTime: new Date(), endTime: new Date(), capacity: 20, price: 15, location: 'Room A' });
 */
export async function createClass(data: CreateClassInput) {
  const cls = await prisma.class.create({
    data,
    include: { instructor: { select: { id: true, name: true, email: true } } },
  });

  if (cls.isRecurring && cls.recurrenceRule && cls.recurrenceEndDate) {
    const instances = buildRecurringInstances(cls);
    if (instances.length > 0) {
      await prisma.class.createMany({ data: instances });
    }
  }

  return cls;
}

/**
 * Returns all classes, optionally filtered.
 * @param filters - Optional filters (status, from, to)
 * @returns Array of class records
 */
export async function getClasses(filters?: { status?: ClassStatus; from?: Date; to?: Date; orderDesc?: boolean }) {
  return prisma.class.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.from && { startTime: { gte: filters.from } }),
      ...(filters?.to && { startTime: { lte: filters.to } }),
    },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      _count: { select: { bookings: { where: { status: 'confirmed' } } } },
    },
    orderBy: { startTime: filters?.orderDesc ? 'desc' : 'asc' },
  });
}

/**
 * Gets a single class by ID.
 * @param id - Class ID
 * @returns Class record with instructor and booking count
 * @throws {NotFoundError} If class not found
 */
export async function getClassById(id: string) {
  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      bookings: {
        where: { status: { in: ['confirmed', 'waitlisted'] } },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { bookings: { where: { status: 'confirmed' } } } },
    },
  });
  if (!cls) throw new NotFoundError('Class not found');
  return cls;
}

/**
 * Updates a fitness class.
 * @param id - Class ID to update
 * @param data - Fields to update
 * @returns Updated class record
 * @throws {NotFoundError} If class not found
 */
export async function updateClass(id: string, data: UpdateClassInput) {
  const existing = await prisma.class.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Class not found');
  return prisma.class.update({
    where: { id },
    data,
    include: { instructor: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Deletes a class by ID.
 * @param id - Class ID to delete
 * @throws {NotFoundError} If class not found
 */
export async function deleteClass(id: string) {
  const existing = await prisma.class.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Class not found');
  return prisma.class.delete({ where: { id } });
}
