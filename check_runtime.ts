
import prisma from './src/lib/prisma';

async function check() {
  try {
    const contact = await prisma.contact.findFirst();
    console.log('Contact found:', contact);
    if (contact) {
      console.log('Has name:', 'name' in contact);
      console.log('Has level:', 'level' in contact);
      console.log('Has dateOfBirth:', 'dateOfBirth' in contact);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
