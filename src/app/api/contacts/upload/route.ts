import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { parseExcelContacts } from '@/lib/excelParser';
import { normalizeGhanaPhone } from '@/lib/phoneNormalizer';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const user = session?.user as {
      role?: string;
      ministryId?: string;
    } | null;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MINISTRY_HEAD')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file uploaded under field "file"' },
        { status: 400 }
      );
    }

    console.log('Starting Excel parse...');
    const parsed = await parseExcelContacts(file);
    console.log(`Parsed ${parsed.length} rows`);

    if (!parsed.length) {
      return NextResponse.json(
        { imported: 0, updated: 0, skipped: 0 },
        { status: 200 }
      );
    }

    const existingSegmentsResult = await prisma.segment.findMany();
    type Segment = (typeof existingSegmentsResult)[number];
    const existingSegments = existingSegmentsResult as Segment[];
    const segmentByName = new Map<string, Segment>();
    existingSegments.forEach((s: Segment) => {
      segmentByName.set(s.name, s);
    });

    const existingMinistriesResult = await prisma.ministry.findMany();
    const ministryByName = new Map<string, (typeof existingMinistriesResult)[number]>();
    existingMinistriesResult.forEach((m) => {
      ministryByName.set(m.name.toLowerCase(), m);
    });

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const skippedDetails: { phone: string; name?: string; reason: string }[] = [];

    for (const row of parsed) {
      try {
        const normalized = normalizeGhanaPhone(row.phone);
        if (!normalized) {
          skipped += 1;
          skippedDetails.push({ 
            phone: row.phone, 
            name: row.name, 
            reason: 'Invalid phone number format' 
          });
          continue;
        }

        const segmentName = row.segmentName.trim();
        if (!segmentName) {
          skipped += 1;
          skippedDetails.push({ 
            phone: row.phone, 
            name: row.name, 
            reason: 'Missing segment name' 
          });
          continue;
        }

        let segment = segmentByName.get(segmentName);
        if (!segment) {
          segment = await prisma.segment.upsert({
            where: { name: segmentName },
            update: {},
            create: { name: segmentName },
          });
          segmentByName.set(segment.name, segment);
        }

        let rowMinistryId = user.role === 'MINISTRY_HEAD' ? user.ministryId : undefined;
        if (!rowMinistryId && row.ministryName) {
          const ministry = ministryByName.get(row.ministryName.toLowerCase());
          if (ministry) {
            rowMinistryId = ministry.id;
          }
        }

        const existingResult = await prisma.contact.findUnique({
          where: { phone: normalized },
        });
        const existing = existingResult as any;

        if (existing) {
          await (prisma.contact as any).update({
            where: { id: existing.id },
            data: {
              segment: { connect: { id: segment.id } },
              rawPhone: row.phone,
              isActive: true,
              name: row.name || existing.name,
              fullName: row.fullName || existing.fullName,
              dateOfBirth: row.dateOfBirth || existing.dateOfBirth,
              level: row.level || existing.level,
              hostel: row.hostel || existing.hostel,
              ministries: rowMinistryId 
                ? { connect: { id: rowMinistryId } } 
                : undefined,
            },
          });
          updated += 1;
        } else {
          await (prisma.contact as any).create({
            data: {
              phone: normalized,
              rawPhone: row.phone,
              segment: { connect: { id: segment.id } },
              name: row.name,
              fullName: row.fullName,
              level: row.level,
              hostel: row.hostel,
              dateOfBirth: row.dateOfBirth,
              ministries: rowMinistryId ? { connect: { id: rowMinistryId } } : undefined,
            },
          });
          imported += 1;
        }
      } catch (rowError) {
        console.error('Error processing row:', row, rowError);
        skipped += 1;
        skippedDetails.push({ 
          phone: row.phone, 
          name: row.name, 
          reason: rowError instanceof Error ? rowError.message : 'Processing error' 
        });
      }
    }

    return NextResponse.json(
      {
        imported,
        updated,
        skipped,
        skippedDetails,
        total: parsed.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
