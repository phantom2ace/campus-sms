import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resendFailedDeliveries } from '@/lib/smsService';

type ResendBody = {
  requestId: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const user = session?.user as {
    role?: string;
  } | null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as ResendBody;
  const requestId = body.requestId;

  if (!requestId) {
    return NextResponse.json(
      { error: 'requestId is required' },
      { status: 400 }
    );
  }

  try {
    const summary = await resendFailedDeliveries(requestId);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to resend messages',
      },
      { status: 500 }
    );
  }
}
