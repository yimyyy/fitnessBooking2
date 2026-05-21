import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fitness.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@fitness.com', passwordHash: adminHash, role: 'admin' },
  });

  // Create instructor
  const instrHash = await bcrypt.hash('Instructor123!', 12);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@fitness.com' },
    update: {},
    create: { name: 'Jane Smith', email: 'instructor@fitness.com', passwordHash: instrHash, role: 'instructor' },
  });

  // Create student
  const stuHash = await bcrypt.hash('Student123!', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@fitness.com' },
    update: {},
    create: { name: 'John Doe', email: 'student@fitness.com', passwordHash: stuHash, role: 'student' },
  });

  // Create classes
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 3600000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 3600000);

  const yogaClass = await prisma.class.upsert({
    where: { id: 'seed-class-1' },
    update: {},
    create: {
      id: 'seed-class-1',
      title: 'Morning Yoga',
      description: 'Relaxing morning yoga for all levels',
      instructorId: instructor.id,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 3600000),
      capacity: 15,
      price: 20,
      location: 'Studio A',
      status: 'upcoming',
    },
  });

  await prisma.class.upsert({
    where: { id: 'seed-class-2' },
    update: {},
    create: {
      id: 'seed-class-2',
      title: 'HIIT Cardio',
      description: 'High-intensity interval training',
      instructorId: instructor.id,
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 2700000),
      capacity: 20,
      price: 25,
      location: 'Main Floor',
      status: 'upcoming',
    },
  });

  // Create a booking for student
  await prisma.booking.upsert({
    where: { id: 'seed-booking-1' },
    update: {},
    create: {
      id: 'seed-booking-1',
      userId: student.id,
      classId: yogaClass.id,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentAmount: 20,
    },
  });

  console.log('Seed complete. Users: admin@fitness.com, instructor@fitness.com, student@fitness.com (passwords: Admin123!, Instructor123!, Student123!)');

  // suppress unused variable warnings
  void admin;
}

main().catch(console.error).finally(() => prisma.$disconnect());
