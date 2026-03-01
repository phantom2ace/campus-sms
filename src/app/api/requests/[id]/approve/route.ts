import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendRequestMessages } from '@/lib/smsService';

type ApproveBody = {
  sendImmediately?: boolean;
  scheduledAt?: string | null;
  targetLevels?: string[];
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const user = session?.user as {
    id?: string;
    role?: string;
  } | null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as ApproveBody;

  const request = await prisma.messageRequest.findUnique({
    where: { id },
  });

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Update target levels if provided
  if (body.targetLevels && Array.isArray(body.targetLevels)) {
    await prisma.messageRequest.update({
      where: { id },
      data: {
        targetLevels: body.targetLevels
      }
    });
  }

  if (request.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Only pending requests can be approved' },
      { status: 400 }
    );
  }

  const adminId = user.id;
  const sendNow =
    typeof body.sendImmediately === 'boolean'
      ? body.sendImmediately
      : request.sendImmediately;

  let scheduledAt: Date | null = request.scheduledAt;
  if (!sendNow) {
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!Number.isNaN(parsed.getTime())) {
        scheduledAt = parsed;
      }
    }
    if (!scheduledAt) {
      return NextResponse.json(
        { error: 'scheduledAt is required when not sending immediately' },
        { status: 400 }
      );
    }
  }

  if (!sendNow) {
    const updated = await prisma.messageRequest.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledAt,
        reviewedAt: new Date(),
        reviewedBy: adminId || null,
      },
    });
    return NextResponse.json(updated, { status: 200 });
  }

  try {
    const sendSummary = await sendRequestMessages(id);
    const updated = await prisma.messageRequest.update({
      where: { id },
      data: {
        reviewedAt: new Date(),
        reviewedBy: adminId || null,
      },
    });

    return NextResponse.json(
      {
        request: updated,
        sendSummary,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to send messages',
      },
      { status: 500 }
    );
  }
}
