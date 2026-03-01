import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendRequestMessages } from '@/lib/smsService';

type SendBody = {
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

  const body = (await req.json()) as SendBody;
  const requestId = body.requestId;

  if (!requestId) {
    return NextResponse.json(
      { error: 'requestId is required' },
      { status: 400 }
    );
  }

  try {
    const summary = await sendRequestMessages(requestId);
    return NextResponse.json(summary, { status: 200 });
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
