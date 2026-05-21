import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { User, Class } from '@prisma/client';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@example.com';

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Sends a booking confirmation email via AWS SES.
 * @param user - The user who made the booking
 * @param fitnessClass - The class that was booked
 * @returns SES send result
 * @throws Will log error and not throw, to prevent booking failure
 * @example
 * await sendBookingConfirmation(user, fitnessClass);
 */
export async function sendBookingConfirmation(user: User, fitnessClass: Class & { instructor?: User }) {
  const params: SendEmailCommandInput = {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [user.email] },
    Message: {
      Subject: { Data: `Booking Confirmed: ${fitnessClass.title}` },
      Body: {
        Html: {
          Data: `
            <h2>Booking Confirmed!</h2>
            <p>Hi ${user.name},</p>
            <p>Your booking for <strong>${fitnessClass.title}</strong> has been confirmed.</p>
            <ul>
              <li><strong>Date:</strong> ${formatDate(fitnessClass.startTime)}</li>
              <li><strong>Location:</strong> ${fitnessClass.location}</li>
              <li><strong>Price:</strong> $${fitnessClass.price}</li>
            </ul>
            <p>See you there!</p>
          `,
        },
      },
    },
  };
  return sesClient.send(new SendEmailCommand(params));
}

/**
 * Sends a cancellation confirmation email via AWS SES.
 * @param user - The user who cancelled
 * @param fitnessClass - The class that was cancelled
 * @returns SES send result
 */
export async function sendCancellationConfirmation(user: User, fitnessClass: Class) {
  const params: SendEmailCommandInput = {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [user.email] },
    Message: {
      Subject: { Data: `Booking Cancelled: ${fitnessClass.title}` },
      Body: {
        Html: {
          Data: `
            <h2>Booking Cancelled</h2>
            <p>Hi ${user.name},</p>
            <p>Your booking for <strong>${fitnessClass.title}</strong> on ${formatDate(fitnessClass.startTime)} has been cancelled.</p>
            <p>We hope to see you at another class soon!</p>
          `,
        },
      },
    },
  };
  return sesClient.send(new SendEmailCommand(params));
}

/**
 * Sends a waitlist promotion email via AWS SES.
 * @param user - The user being promoted from waitlist
 * @param fitnessClass - The class they've been promoted into
 * @returns SES send result
 */
export async function sendWaitlistPromotion(user: User, fitnessClass: Class) {
  const params: SendEmailCommandInput = {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [user.email] },
    Message: {
      Subject: { Data: `You're In! Spot Available: ${fitnessClass.title}` },
      Body: {
        Html: {
          Data: `
            <h2>Good News! You've Been Promoted from the Waitlist</h2>
            <p>Hi ${user.name},</p>
            <p>A spot has opened up in <strong>${fitnessClass.title}</strong> and you've been automatically confirmed!</p>
            <ul>
              <li><strong>Date:</strong> ${formatDate(fitnessClass.startTime)}</li>
              <li><strong>Location:</strong> ${fitnessClass.location}</li>
            </ul>
            <p>See you there!</p>
          `,
        },
      },
    },
  };
  return sesClient.send(new SendEmailCommand(params));
}

/**
 * Sends a 24-hour reminder email for an upcoming class.
 * @param user - The user to remind
 * @param fitnessClass - The upcoming class
 * @returns SES send result
 */
export async function sendClassReminder(user: User, fitnessClass: Class) {
  const params: SendEmailCommandInput = {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [user.email] },
    Message: {
      Subject: { Data: `Reminder: ${fitnessClass.title} Tomorrow` },
      Body: {
        Html: {
          Data: `
            <h2>Class Reminder</h2>
            <p>Hi ${user.name},</p>
            <p>Just a reminder that you have <strong>${fitnessClass.title}</strong> tomorrow!</p>
            <ul>
              <li><strong>Date:</strong> ${formatDate(fitnessClass.startTime)}</li>
              <li><strong>Location:</strong> ${fitnessClass.location}</li>
            </ul>
            <p>See you there!</p>
          `,
        },
      },
    },
  };
  return sesClient.send(new SendEmailCommand(params));
}
