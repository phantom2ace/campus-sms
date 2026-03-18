import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
  const { targetSegments, targetLevels, specificPhoneNumbers } = body;

  const whereClause: any = {
    isActive: true,
  };

  // If ministry head, only count contacts in their ministry
  if (user.role === 'MINISTRY_HEAD') {
    whereClause.ministries = {
      some: { id: user.ministryId },
    };
  }

  const conditions: any[] = [];

  if (targetSegments && targetSegments.length > 0) {
    conditions.push({
      segment: { name: { in: targetSegments } },
    });
  }

  if (targetLevels && targetLevels.length > 0) {
    conditions.push({
      level: { in: targetLevels },
    });
  }

  if (conditions.length > 0) {
    whereClause.OR = conditions;
  }

  // Count unique contacts from selection
  const contacts = await (prisma.contact as any).findMany({
    where: whereClause,
    select: { phone: true },
  });

  const phones = new Set(contacts.map((c: any) => c.phone));

  // Add specific numbers
  if (specificPhoneNumbers && specificPhoneNumbers.length > 0) {
    specificPhoneNumbers.forEach((p: string) => {
      if (p.trim()) phones.add(p.trim());
    });
  }

  return NextResponse.json({ count: phones.size });
}
