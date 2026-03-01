
import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const noNameContacts = await prisma.contact.count({
    where: { name: null },
  });
  const emptyNameContacts = await prisma.contact.count({
    where: { name: '' },
  });
  console.log('Contacts with null name:', noNameContacts);
  console.log('Contacts with empty name:', emptyNameContacts);

  const allContacts = await prisma.contact.findMany({
    select: { name: true, phone: true },
  });
  console.log('Total contacts:', allContacts.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
