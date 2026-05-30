import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { User, Class } from '@prisma/client';
import { pushLog } from './logService';

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

function devLog(to: string, subject: string, html: string): void {
  const preview = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const border = '─'.repeat(60);
  console.log(`\n${border}`);
  console.log(`📧  [DEV EMAIL]`);
  console.log(`    From:    ${FROM_EMAIL}`);
  console.log(`    To:      ${to}`);
  console.log(`    Subject: ${subject}`);
  console.log(`    Body:\n${preview}`);
  console.log(`${border}\n`);
}

async function send(params: SendEmailCommandInput): Promise<void> {
  const to = (params.Destination?.ToAddresses ?? []).join(', ');
  const subject = params.Message?.Subject?.Data ?? '';
  const html = params.Message?.Body?.Html?.Data ?? '';

  if (process.env.NODE_ENV !== 'production') {
    devLog(to, subject, html);
    pushLog('email', `[dev] ${subject}`, `To: ${to}`);
    return;
  }

  await sesClient.send(new SendEmailCommand(params));
  pushLog('email', subject, `To: ${to}`);
}

export async function sendBookingConfirmation(user: User, fitnessClass: Class & { instructor?: User }) {
  return send({
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
  });
}

export async function sendCancellationConfirmation(user: User, fitnessClass: Class) {
  return send({
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
  });
}

export async function sendWaitlistConfirmation(user: User, fitnessClass: Class) {
  return send({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [user.email] },
    Message: {
      Subject: { Data: `You're on the Waitlist: ${fitnessClass.title}` },
      Body: {
        Html: {
          Data: `
            <h2>You're on the Waitlist!</h2>
            <p>Hi ${user.name},</p>
            <p>The class <strong>${fitnessClass.title}</strong> is currently full, but you've been added to the waitlist.</p>
            <ul>
              <li><strong>Date:</strong> ${formatDate(fitnessClass.startTime)}</li>
              <li><strong>Location:</strong> ${fitnessClass.location}</li>
            </ul>
            <p>We'll email you right away if a spot opens up!</p>
          `,
        },
      },
    },
  });
}

export async function sendWaitlistPromotion(user: User, fitnessClass: Class) {
  return send({
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
  });
}

export async function sendClassReminder(user: User, fitnessClass: Class) {
  return send({
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
  });
}
