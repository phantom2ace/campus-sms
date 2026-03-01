import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendRequestMessages } from '@/lib/smsService';
import { RequestStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const user = session?.user as {
    role?: string;
    ministryId?: string;
  } | null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = user.role;
  const ministryId = user.ministryId;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const where: {
    status?: RequestStatus;
    ministryId?: string;
  } = {};

  if (status) {
    where.status = status as RequestStatus;
  }

  if (role === 'MINISTRY_HEAD' && ministryId) {
    where.ministryId = ministryId;
  }

  const requests = await prisma.messageRequest.findMany({
    where,
    include: {
      ministry: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(requests, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const user = session?.user as {
    role?: string;
    ministryId?: string;
  } | null;

  if (!user || (user.role !== 'MINISTRY_HEAD' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let ministryId = user.ministryId;
  
  // If Admin doesn't have a ministry, use or create "Administration" ministry
  if (!ministryId && user.role === 'ADMIN') {
    const adminMinistry = await prisma.ministry.upsert({
      where: { name: 'Administration' },
      update: {},
      create: { name: 'Administration' },
    });
    ministryId = adminMinistry.id;
  }

  if (!ministryId) {
    return NextResponse.json(
      { error: 'Ministry not associated with user' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const programName = String(body.programName || '').trim();
  const messageContent = String(body.messageContent || '').trim();
  const targetSegments = Array.isArray(body.targetSegments)
    ? body.targetSegments.map((s: unknown) => String(s))
    : [];
  const targetLevels = Array.isArray(body.targetLevels)
    ? body.targetLevels.map((l: unknown) => String(l))
    : [];
  const specificPhoneNumbers = Array.isArray(body.specificPhoneNumbers)
    ? body.specificPhoneNumbers.map((p: unknown) => String(p))
    : [];
  const sendImmediately =
    typeof body.sendImmediately === 'boolean' ? body.sendImmediately : true;
  const scheduledAtRaw = body.scheduledAt as string | undefined;

  if (!programName || !messageContent || (!targetSegments.length && !targetLevels.length && !specificPhoneNumbers.length)) {
    return NextResponse.json(
      {
        error:
          'programName, messageContent and at least one target segment, level, or specific number are required',
      },
      { status: 400 }
    );
  }

  let scheduledAt: Date | null = null;
  if (!sendImmediately && scheduledAtRaw) {
    const parsed = new Date(scheduledAtRaw);
    if (!Number.isNaN(parsed.getTime())) {
      scheduledAt = parsed;
    }
  }

  try {
    const created = await prisma.messageRequest.create({
      data: {
        ministryId,
        programName,
        messageContent,
        targetSegments,
        targetLevels,
        specificPhoneNumbers,
        sendImmediately,
        scheduledAt,
      },
    });

    // Only allow immediate sending if the user is an ADMIN
    // Ministry Heads must wait for approval, so their requests remain PENDING
    if (sendImmediately && user.role === 'ADMIN') {
      try {
        await sendRequestMessages(created.id);
        // Refresh to get updated status
        const updated = await prisma.messageRequest.findUnique({
          where: { id: created.id },
          include: { ministry: true },
        });
        return NextResponse.json(updated || created, { status: 201 });
      } catch (sendError) {
        console.error('Failed to send immediately:', sendError);
        // Return created request but with error note? Or just return created (which is PENDING)
        // We'll return the created request, the user can see it's PENDING and maybe try again or check logs
        return NextResponse.json(created, { status: 201 });
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating message request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create message request: ${errorMessage}` },
      { status: 500 }
    );
  }
}
