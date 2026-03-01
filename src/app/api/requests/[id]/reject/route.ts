import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type RejectBody = {
  reason?: string;
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
  const body = (await req.json()) as RejectBody;

  const request = await prisma.messageRequest.findUnique({
    where: { id },
  });

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (request.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Only pending requests can be rejected' },
      { status: 400 }
    );
  }

  const adminId = user.id;

  const updated = await prisma.messageRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: body.reason || null,
      reviewedAt: new Date(),
      reviewedBy: adminId || null,
    },
  });

  return NextResponse.json(updated, { status: 200 });
}
