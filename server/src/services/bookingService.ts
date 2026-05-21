import { prisma } from '../prisma/client';
import { ConflictError, NotFoundError, ForbiddenError } from '../errors/AppError';
import { sendBookingConfirmation, sendCancellationConfirmation, sendWaitlistPromotion } from './sesEmailService';

/**
 * Books a student into a fitness class, or adds them to the waitlist if full.
 * @param userId - The ID of the student making the booking
 * @param classId - The ID of the class to book
 * @returns The created Booking record
 * @throws {ConflictError} If the student already has a booking for this class
 * @throws {NotFoundError} If the class does not exist
 * @example
 * const booking = await createBooking('user-123', 'class-456');
 */
export async function createBooking(userId: string, classId: string) {
  // Verify class exists
  const fitnessClass = await prisma.class.findUnique({
    where: { id: classId },
    include: { instructor: true },
  });
  if (!fitnessClass) throw new NotFoundError('Class not found');
  if (fitnessClass.status === 'cancelled') throw new ConflictError('Class is cancelled');

  // Check duplicate booking
  const existing = await prisma.booking.findFirst({
    where: { userId, classId, status: { in: ['confirmed', 'waitlisted'] } },
  });
  if (existing) throw new ConflictError('Already booked for this class');

  // Count confirmed bookings
  const confirmedCount = await prisma.booking.count({
    where: { classId, status: 'confirmed' },
  });

  const isWaitlisted = confirmedCount >= fitnessClass.capacity;
  const bookingStatus = isWaitlisted ? 'waitlisted' : 'confirmed';

  const booking = await prisma.booking.create({
    data: {
      userId,
      classId,
      status: bookingStatus,
      paymentAmount: fitnessClass.price,
      paymentStatus: 'pending',
    },
    include: { user: true, class: { include: { instructor: true } } },
  });

  // Update class status if now full
  if (!isWaitlisted && confirmedCount + 1 >= fitnessClass.capacity) {
    await prisma.class.update({
      where: { id: classId },
      data: { status: 'full' },
    });
  }

  // Send confirmation email
  try {
    if (isWaitlisted) {
      // no dedicated waitlist booking email yet, use confirmation with note
    } else {
      await sendBookingConfirmation(booking.user, booking.class);
    }
  } catch (err) {
    console.error('Email send failed (non-fatal):', err);
  }

  return booking;
}

/**
 * Cancels a booking and auto-promotes the first waitlisted user if applicable.
 * @param bookingId - The booking ID to cancel
 * @param userId - The user requesting the cancellation
 * @param cancellationWindowHours - Hours before class start that cancellation is allowed
 * @returns The cancelled booking
 * @throws {NotFoundError} If booking does not exist
 * @throws {ForbiddenError} If user does not own the booking or outside cancellation window
 * @example
 * const cancelled = await cancelBooking('booking-123', 'user-456', 24);
 */
export async function cancelBooking(bookingId: string, userId: string, cancellationWindowHours = 24) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, class: { include: { instructor: true } } },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.userId !== userId) throw new ForbiddenError('Not your booking');
  if (booking.status === 'cancelled') throw new ConflictError('Booking already cancelled');

  // Check cancellation window
  const hoursUntilClass = (booking.class.startTime.getTime() - Date.now()) / 3600000;
  if (hoursUntilClass < cancellationWindowHours) {
    throw new ForbiddenError(`Cancellations must be made at least ${cancellationWindowHours} hours before class`);
  }

  const wasConfirmed = booking.status === 'confirmed';

  // Cancel the booking
  const cancelled = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'cancelled', cancelledAt: new Date() },
    include: { user: true, class: true },
  });

  // Send cancellation email
  try {
    await sendCancellationConfirmation(booking.user, booking.class);
  } catch (err) {
    console.error('Email send failed (non-fatal):', err);
  }

  // Promote first waitlisted user if this was a confirmed spot
  if (wasConfirmed) {
    const firstWaitlisted = await prisma.booking.findFirst({
      where: { classId: booking.classId, status: 'waitlisted' },
      orderBy: { bookedAt: 'asc' },
      include: { user: true, class: { include: { instructor: true } } },
    });

    if (firstWaitlisted) {
      await prisma.booking.update({
        where: { id: firstWaitlisted.id },
        data: { status: 'confirmed' },
      });

      // Update class status back to upcoming if it was full
      await prisma.class.update({
        where: { id: booking.classId },
        data: { status: 'upcoming' },
      });

      try {
        await sendWaitlistPromotion(firstWaitlisted.user, firstWaitlisted.class);
      } catch (err) {
        console.error('Waitlist promotion email failed (non-fatal):', err);
      }
    }
  }

  return cancelled;
}

/**
 * Gets all bookings for a user.
 * @param userId - The user ID
 * @returns Array of bookings with class details
 */
export async function getUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    include: { class: { include: { instructor: { select: { name: true, email: true } } } } },
    orderBy: { bookedAt: 'desc' },
  });
}
