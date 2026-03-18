import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { normalizeGhanaPhone } from '@/lib/phoneNormalizer';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const user = session?.user as {
    role?: string;
    ministryId?: string;
  } | null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MINISTRY_HEAD')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const segmentId = searchParams.get('segmentId');

  const contacts = await (prisma.contact as any).findMany({
    where: {
      isActive: true,
      ...(segmentId ? { segmentId } : {}),
      ...(user.role === 'MINISTRY_HEAD' ? { ministries: { some: { id: user.ministryId } } } : {}),
    },
    include: {
      segment: true,
      ministries: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(contacts, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const user = session?.user as {
    role?: string;
    ministryId?: string;
  } | null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MINISTRY_HEAD')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const rawPhone = String(body.phone || '');
  const name = String(body.name || '');
  const fullName = String(body.fullName || '');
  const level = String(body.level || '');
  const hostel = String(body.hostel || '');
  const ministryId = user.role === 'MINISTRY_HEAD' ? user.ministryId : body.ministryId;
  const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;

  if (!rawPhone || !name) {
    return NextResponse.json(
      { error: 'Name and phone are required' },
      { status: 400 }
    );
  }

  const normalized = normalizeGhanaPhone(rawPhone);
  if (!normalized) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  // Check if contact exists
  const existing = await prisma.contact.findUnique({
    where: { phone: normalized },
  });

  if (existing) {
    // Update existing contact
    const updated = await (prisma.contact as any).update({
      where: { id: existing.id },
      data: {
        name,
        fullName,
        level,
        hostel,
        dateOfBirth,
        ministries: ministryId ? { connect: { id: ministryId } } : undefined,
        isActive: true,
      },
    });
    return NextResponse.json(updated, { status: 200 });
  }

  // Create new contact
  // Note: segmentId is optional/deprecated in favor of level-based targeting
  // Use a default segment 'General' if not provided
  let defaultSegment = await prisma.segment.findFirst({
    where: { name: 'General' },
  });

  if (!defaultSegment) {
    defaultSegment = await prisma.segment.create({
      data: { name: 'General' },
    });
  }

  const created = await (prisma.contact as any).create({
    data: {
      phone: normalized,
      rawPhone,
      name,
      fullName,
      level,
      hostel,
      dateOfBirth,
      ministries: ministryId ? { connect: { id: ministryId } } : undefined,
      segment: { connect: { id: defaultSegment.id } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
