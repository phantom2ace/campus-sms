import '@/lib/env';
import prisma from '@/lib/prisma';

async function main() {
  const ministries = await prisma.ministry.findMany({
    include: {
      _count: {
        select: { users: true, requests: true }
      }
    }
  });

  console.log('Current Ministries:', ministries.length);
  ministries.forEach(ministry => {
    console.log(`- ${ministry.name} (Users: ${ministry._count?.users || 0}, Requests: ${ministry._count?.requests || 0})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
