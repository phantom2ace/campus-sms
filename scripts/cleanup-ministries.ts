import { PrismaClient } from '@prisma/client';
import '@/lib/env';
import prismaInstance from '../src/lib/prisma';

const prisma = prismaInstance as any;

const validMinistries = [
  "Administration",
  "Prayer Ministry",
  "Communion Ministry",
  "Praise and Worship",
  "Lord's Band",
  "Media Ministry",
  "Protocol Ministry",
  "MCC",
  "CJC",
  "Discipleship Ministry",
  "Missions and Evangelism",
  "Peer Counsellors",
  "Area Reps"
];

async function main() {
  console.log('Cleaning up ministries...');
  
  // Find invalid ministries
  const invalidMinistries = await prisma.ministry.findMany({
    where: {
      name: { notIn: validMinistries }
    },
    include: { users: true }
  });

  console.log(`Found ${invalidMinistries.length} invalid ministries to delete.`);

  for (const ministry of invalidMinistries) {
    // The users relation might not be fully typed correctly in script context if types are stale
    // but at runtime it works if include is used. 
    // We cast to any to avoid TS errors in this maintenance script.
    const m = ministry as any;
    
    console.log(`Deleting ministry: ${m.name} (with ${m.users?.length || 0} users)`);
    
    // Delete users associated with this ministry first
    if (m.users && m.users.length > 0) {
      await prisma.user.deleteMany({
        where: { ministryId: m.id }
      });
      console.log(`  - Deleted users for ${m.name}`);
    }

    // Delete the ministry
    await prisma.ministry.delete({
      where: { id: m.id }
    });
    console.log(`  - Deleted ministry ${m.name}`);
  }

  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
