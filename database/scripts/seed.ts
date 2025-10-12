import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@zenconnect.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@zenconnect.com',
      password: hashedPassword,
      name: 'Regular User',
      role: 'user',
    },
  });

  console.log('✅ Created admin user:', adminUser.email);
  console.log('✅ Created regular user:', regularUser.email);

  // Create test services
  const services = await prisma.service.createMany({
    data: [
      {
        name: 'General Consultation',
        category: 'consultation',
        description: 'General medical consultation',
      },
      {
        name: 'Physical Therapy',
        category: 'therapy',
        description: 'Physical rehabilitation therapy',
      },
      {
        name: 'Lab Tests',
        category: 'diagnostic',
        description: 'Laboratory testing services',
      },
    ],
  });

  console.log('✅ Created services:', services.count);

  // Create test tasks
  const tasks = await prisma.task.createMany({
    data: [
      {
        title: 'Review patient files',
        description: 'Review and organize patient documentation',
        status: 'pending',
        priority: 'high',
        userId: adminUser.id,
      },
      {
        title: 'Update service catalog',
        description: 'Add new services to the catalog',
        status: 'in_progress',
        priority: 'medium',
        userId: adminUser.id,
      },
      {
        title: 'Process referrals',
        description: 'Handle incoming patient referrals',
        status: 'completed',
        priority: 'high',
        userId: adminUser.id,
      },
    ],
  });

  console.log('✅ Created tasks:', tasks.count);

  // Create test referrals
  const referrals = await prisma.referral.createMany({
    data: [
      {
        code: 'REF001',
        patientName: 'John Doe',
        patientEmail: 'john.doe@email.com',
        patientPhone: '+1234567890',
        referredBy: 'Dr. Smith',
        status: 'pending',
        notes: 'Referred for physical therapy consultation',
      },
      {
        code: 'REF002',
        patientName: 'Jane Smith',
        patientEmail: 'jane.smith@email.com',
        patientPhone: '+1234567891',
        referredBy: 'Dr. Johnson',
        status: 'contacted',
        notes: 'Follow-up appointment needed',
      },
    ],
  });

  console.log('✅ Created referrals:', referrals.count);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
