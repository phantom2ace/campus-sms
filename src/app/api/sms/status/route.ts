import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json(
      { error: 'requestId query parameter is required' },
      { status: 400 }
    );
  }

  const request = await prisma.messageRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { requestId },
    include: {
      contact: true,
    },
    orderBy: {
      sentAt: 'asc',
    },
  });

  return NextResponse.json(
    {
      request,
      deliveries,
    },
    { status: 200 }
  );
}

