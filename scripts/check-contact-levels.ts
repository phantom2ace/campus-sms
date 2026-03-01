import '@/lib/env';
import prisma from '@/lib/prisma';

async function main() {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      level: true,
      segment: { select: { name: true } }
    }
  });
  
  console.log('Contacts sample (first 10):');
  contacts.slice(0, 10).forEach(c => {
    const contact = c as any;
    console.log(`Contact ${contact.id}: Level=${contact.level}, Segment=${contact.segment?.name}`);
  });
  
  const noLevel = contacts.filter(c => !(c as any).level).length;
  console.log(`Total contacts: ${contacts.length}`);
  console.log(`Contacts without level: ${noLevel}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
