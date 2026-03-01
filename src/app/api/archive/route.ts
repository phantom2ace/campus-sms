import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RequestStatus, DeliveryStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as {
    role?: string;
    ministryId?: string;
  };

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
      deliveries: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const archive = requests.map((req) => {
    const delivered = req.deliveries.filter(
      (d) => d.status === DeliveryStatus.DELIVERED
    ).length;
    const failed = req.deliveries.filter((d) => d.status === DeliveryStatus.FAILED).length;

    return {
      id: req.id,
      programName: req.programName,
      messageContent: req.messageContent,
      ministryName: req.ministry.name,
      status: req.status,
      createdAt: req.createdAt,
      sentAt: req.sentAt,
      targetSegments: req.targetSegments,
      delivered,
      failed,
      total: req.deliveries.length,
    };
  });

  return NextResponse.json(archive, { status: 200 });
}
