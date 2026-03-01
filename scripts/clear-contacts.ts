import '@/lib/env';
import prisma from '@/lib/prisma';

async function main() {
  console.log('Starting cleanup...');
  
  // 1. Delete all DeliveryRecords first to avoid foreign key constraints
  console.log('Deleting delivery records...');
  // prisma client types might not be fully synced in scripts
  const deletedDeliveries = await prisma.deliveryRecord.deleteMany({});
  console.log(`Deleted ${deletedDeliveries.count} delivery records.`);

  // 2. Delete all Contacts
  console.log('Deleting contacts...');
  // prisma client types might not be fully synced in scripts
  const deletedContacts = await prisma.contact.deleteMany({});
  console.log(`Deleted ${deletedContacts.count} contacts.`);

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
