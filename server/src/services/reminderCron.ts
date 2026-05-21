import cron from 'node-cron';
import { prisma } from '../prisma/client';
import { sendClassReminder } from './sesEmailService';

/**
 * Schedules a cron job that runs every hour to send 24-hour reminders for upcoming classes.
 * Finds confirmed bookings for classes starting in the next 24-25 hours (1-hour window to avoid duplicate sends).
 * @example
 * scheduleReminders(); // Call once at app startup
 */
export function scheduleReminders(): void {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find confirmed bookings for classes starting in 24-25 hours
      const bookings = await prisma.booking.findMany({
        where: {
          status: 'confirmed',
          class: {
            startTime: { gte: in24h, lte: in25h },
            status: { not: 'cancelled' },
          },
        },
        include: { user: true, class: true },
      });

      for (const booking of bookings) {
        try {
          await sendClassReminder(booking.user, booking.class);
          await prisma.notification.create({
            data: {
              userId: booking.userId,
              type: 'reminder',
              meta: { classId: booking.classId, classTitle: booking.class.title },
            },
          });
        } catch (err) {
          console.error(`Failed to send reminder for booking ${booking.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Reminder cron error:', err);
    }
  });
}
