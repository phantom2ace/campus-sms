
import 'dotenv/config'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma'

async function main() {
  const adminPassword = await bcrypt.hash('password123', 10)
  const ministryPassword = await bcrypt.hash('ministry123', 10)

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campus.edu' },
    update: {},
    create: {
      email: 'admin@campus.edu',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
    },
  })

  // Create Ministry (Prayer Ministry)
  const prayerMinistry = await prisma.ministry.upsert({
    where: { name: 'Prayer Ministry' },
    update: {},
    create: {
      name: 'Prayer Ministry',
    },
  })

  // Then create the ministry head user
  const ministryHead = await prisma.user.upsert({
    where: { email: 'prayer@campusministry.com' },
    update: {},
    create: {
      email: 'prayer@campusministry.com',
      name: 'Prayer Leader',
      password: ministryPassword,
      role: Role.MINISTRY_HEAD,
      ministryId: prayerMinistry.id,
    },
  })

  console.log({ admin, ministryHead })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
