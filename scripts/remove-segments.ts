import '@/lib/env';
import prisma from '@/lib/prisma';

async function main() {
  console.log('Starting segment cleanup...');

  // 1. Find the segments
  const segments = await prisma.segment.findMany();
  const phoneSegment = segments.find(s => s.name === 'Phone Number');
  const membersSegment = segments.find(s => s.name === 'Members');
  const level100Segment = segments.find(s => s.name === '100');

  if (!phoneSegment) {
    console.error('Phone Number segment not found. Cannot proceed.');
    process.exit(1);
  }

  console.log(`Target segment: ${phoneSegment.name} (${phoneSegment.id})`);

  // 2. Move contacts from 'Members' to 'Phone Number'
  if (membersSegment) {
    console.log(`Moving contacts from ${membersSegment.name} (${membersSegment.id})...`);
    // @ts-ignore
    const result = await prisma.contact.updateMany({
      where: { segmentId: membersSegment.id },
      data: { segmentId: phoneSegment.id }
    });
    console.log(`Moved ${(result as any).count} contacts.`);
    
    // Delete the segment
    console.log(`Deleting segment ${membersSegment.name}...`);
    // @ts-ignore
    await prisma.segment.delete({
      where: { id: membersSegment.id }
    });
  } else {
    console.log('Members segment not found or already deleted.');
  }

  // 3. Move contacts from '100' to 'Phone Number' (if any)
  if (level100Segment) {
    console.log(`Moving contacts from ${level100Segment.name} (${level100Segment.id})...`);
    // @ts-ignore
    const result = await prisma.contact.updateMany({
      where: { segmentId: level100Segment.id },
      data: { segmentId: phoneSegment.id }
    });
    console.log(`Moved ${(result as any).count} contacts.`);

    // Delete the segment
    console.log(`Deleting segment ${level100Segment.name}...`);
    // @ts-ignore
    await prisma.segment.delete({
      where: { id: level100Segment.id }
    });
  } else {
    console.log('100 segment not found or already deleted.');
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
