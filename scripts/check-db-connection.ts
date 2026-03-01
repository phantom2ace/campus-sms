import { PrismaClient } from '@prisma/client';
import '@/lib/env';
import prismaInstance from '../src/lib/prisma';

const prisma = prismaInstance as any;

async function main() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connection successful!');
    
    // Run a simple query to verify data access
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users in the database.`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
