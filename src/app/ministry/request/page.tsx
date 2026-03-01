import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UnauthorizedPage from '@/app/unauthorized/page';
import prisma from '@/lib/prisma';
import RequestForm from '@/components/RequestForm';

export default async function MinistryRequestPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'MINISTRY_HEAD') {
    return <UnauthorizedPage />;
  }

  const segments = await prisma.segment.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          New SMS Request
        </h1>
        <p className="text-slate-400 text-sm">
          Submit a message to be reviewed and sent by the system administrator.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <RequestForm segments={segments} />
      </div>
    </div>
  );
}

