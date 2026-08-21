import { PrismaClient, FlatType } from '@prisma/client'

const prisma = new PrismaClient()

const FLAT_TYPES: FlatType[] = ['ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'FOUR_BHK', 'STUDIO', 'PENTHOUSE']
const SERVICE_TYPES = ['regular-cleaning', 'deep-cleaning', 'full-deep-cleaning']
const ADD_ONS = [
  'Window Cleaning',
  'Oven Cleaning',
  'Carpet Cleaning',
  'Fridge Cleaning',
  'Deep Kitchen Cleaning',
  'Bathroom Deep Cleaning',
  'Balcony Cleaning',
]

async function main() {
  for (const flatType of FLAT_TYPES) {
    for (const serviceType of SERVICE_TYPES) {
      await prisma.priceRate.upsert({
        where: { flatType_serviceType: { flatType, serviceType } },
        update: {},
        create: { flatType, serviceType, price: null },
      })
    }
  }

  for (const name of ADD_ONS) {
    await prisma.addOnPrice.upsert({
      where: { name },
      update: {},
      create: { name, price: null },
    })
  }

  console.log('✅ Seeded price rates and add-on prices (blank — set them from Admin → Pricing)')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
