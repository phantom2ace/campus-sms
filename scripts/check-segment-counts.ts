import '@/lib/env';
import prisma from '@/lib/prisma';

async function main() {
  const segments = await prisma.segment.findMany({
    include: {
      _count: {
        select: { contacts: true }
      }
    }
  });
  
  console.log('Segments with counts:');
  segments.forEach(s => {
    // @ts-ignore
    console.log(`${s.name} (${s.id}): ${s._count.contacts} contacts`);
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
