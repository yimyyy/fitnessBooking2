import { createBooking, cancelBooking } from '../../services/bookingService';
import { prisma } from '../../prisma/client';
import { ConflictError, NotFoundError, ForbiddenError } from '../../errors/AppError';
import * as emailService from '../../services/sesEmailService';

jest.mock('../../prisma/client', () => ({
  prisma: {
    class: { findUnique: jest.fn(), update: jest.fn() },
    booking: { findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    notification: { create: jest.fn() },
  },
}));

jest.mock('../../services/sesEmailService', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
  sendCancellationConfirmation: jest.fn().mockResolvedValue(undefined),
  sendWaitlistPromotion: jest.fn().mockResolvedValue(undefined),
  sendWaitlistConfirmation: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockClass = {
  id: 'class-1',
  title: 'Yoga',
  capacity: 10,
  price: 20,
  status: 'upcoming',
  startTime: new Date(Date.now() + 48 * 3600000),
  endTime: new Date(Date.now() + 49 * 3600000),
  location: 'Room A',
  instructor: { id: 'instr-1', name: 'Jane', email: 'jane@test.com' },
};

const mockUser = { id: 'user-1', name: 'Alice', email: 'alice@test.com', language: 'en' };

describe('bookingService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createBooking', () => {
    it('books successfully when spots available', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-1', userId: 'user-1', classId: 'class-1', status: 'confirmed',
        user: mockUser, class: mockClass,
      });

      const booking = await createBooking('user-1', 'class-1');
      expect(booking.status).toBe('confirmed');
    });

    it('adds to waitlist when class is full', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-2', userId: 'user-1', classId: 'class-1', status: 'waitlisted',
        user: mockUser, class: mockClass,
      });

      const booking = await createBooking('user-1', 'class-1');
      expect(booking.status).toBe('waitlisted');
      expect(mockPrisma.class.update).not.toHaveBeenCalled();
    });

    it('sends waitlist confirmation email when booking is waitlisted', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-2', userId: 'user-1', classId: 'class-1', status: 'waitlisted',
        user: mockUser, class: mockClass,
      });

      await createBooking('user-1', 'class-1');
      expect(emailService.sendWaitlistConfirmation).toHaveBeenCalledWith(mockUser, mockClass);
      expect(emailService.sendBookingConfirmation).not.toHaveBeenCalled();
    });

    it('sends booking confirmation email (not waitlist) when booking is confirmed', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-1', userId: 'user-1', classId: 'class-1', status: 'confirmed',
        user: mockUser, class: mockClass,
      });

      await createBooking('user-1', 'class-1');
      expect(emailService.sendBookingConfirmation).toHaveBeenCalledWith(mockUser, mockClass);
      expect(emailService.sendWaitlistConfirmation).not.toHaveBeenCalled();
    });

    it('marks class as full when the last confirmed spot is taken', async () => {
      const almostFullClass = { ...mockClass, capacity: 2 };
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(almostFullClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(1); // 1 of 2 spots taken
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking-3', userId: 'user-2', classId: 'class-1', status: 'confirmed',
        user: mockUser, class: almostFullClass,
      });
      (mockPrisma.class.update as jest.Mock).mockResolvedValue({ ...almostFullClass, status: 'full' });

      const booking = await createBooking('user-2', 'class-1');
      expect(booking.status).toBe('confirmed');
      expect(mockPrisma.class.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'full' } })
      );
    });

    it('throws ConflictError if already booked', async () => {
      (mockPrisma.class.findUnique as jest.Mock).mockResolvedValue(mockClass);
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({ id: 'existing', status: 'confirmed' });

      await expect(createBooking('user-1', 'class-1')).rejects.toThrow(ConflictError);
    });
  });

  describe('cancelBooking', () => {
    const mockBooking = {
      id: 'booking-1',
      userId: 'user-1',
      classId: 'class-1',
      status: 'confirmed',
      user: mockUser,
      class: { ...mockClass, startTime: new Date(Date.now() + 48 * 3600000) },
    };

    it('cancels confirmed booking and promotes first waitlisted user', async () => {
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({ ...mockBooking, status: 'cancelled' });
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      await cancelBooking('booking-1', 'user-1', 24);
      expect(mockPrisma.booking.update).toHaveBeenCalled();
    });

    it('throws NotFoundError if booking does not exist', async () => {
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(cancelBooking('nonexistent', 'user-1', 24)).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if outside cancellation window', async () => {
      const soonBooking = {
        ...mockBooking,
        class: { ...mockClass, startTime: new Date(Date.now() + 1 * 3600000) },
      };
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(soonBooking);
      await expect(cancelBooking('booking-1', 'user-1', 24)).rejects.toThrow(ForbiddenError);
    });
  });
});
