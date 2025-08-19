import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'admin123', // In production, use hashed password
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created:', adminUser.username)

  // Create sample booking (optional)
  const sampleBooking = await prisma.booking.create({
    data: {
      name: 'Sample Customer',
      email: 'sample@example.com',
      phone: '9876543210',
      address: '123 Sample Street, Sample City',
      serviceType: 'deep-cleaning',
      frequency: 'one-time',
      preferredDate: new Date('2024-01-20'),
      preferredTime: '14:00',
      bedrooms: '2',
      bathrooms: '2',
      additionalServices: '["Window Cleaning", "Carpet Cleaning"]',
      specialInstructions: 'Sample booking for testing',
      status: 'PENDING',
    },
  })

  console.log('✅ Sample booking created:', sampleBooking.id)

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
