
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const ministryHeads = await prisma.user.findMany({
      where: {
        role: 'MINISTRY_HEAD',
      },
      include: {
        ministry: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log('\nMinistry Head Accounts:');
    console.log('-----------------------');
    
    if (ministryHeads.length === 0) {
      console.log('No ministry head accounts found.');
    } else {
      ministryHeads.forEach((user) => {
        console.log(`Name:     ${user.name}`);
        console.log(`Email:    ${user.email}`);
        console.log(`Role:     ${user.role}`);
        console.log(`Ministry: ${user.ministry ? user.ministry.name : 'N/A'}`);
        console.log('-----------------------');
      });
    }
  } catch (error) {
    console.error('Error fetching ministry heads:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
