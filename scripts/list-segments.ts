import '@/lib/env';
import prisma from '@/lib/prisma';

async function main() {
  const segments = await prisma.segment.findMany();
  console.log('Segments:', segments);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
