import { prisma } from '../prisma/client';
import { NotFoundError } from '../errors/AppError';
import { ClassStatus } from '@prisma/client';

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
  return prisma.class.create({
    data,
    include: { instructor: { select: { id: true, name: true, email: true } } },
  });
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
