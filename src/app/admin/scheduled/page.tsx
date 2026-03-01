import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UnauthorizedPage from '@/app/unauthorized/page';
import prisma from '@/lib/prisma';

export default async function AdminScheduledPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return <UnauthorizedPage />;
  }

  const requests = await prisma.messageRequest.findMany({
    where: { status: 'SCHEDULED' },
    include: { ministry: true },
    orderBy: { scheduledAt: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Scheduled Messages
        </h1>
        <p className="text-slate-400 text-sm">
          View all upcoming messages that have been approved for future dates.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">
            There are no scheduled messages at the moment.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request: (typeof requests)[number]) => (
              <div
                key={request.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white/5 rounded-xl p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {request.programName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {request.ministry.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-200 line-clamp-2">
                    {request.messageContent}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Segments:{' '}
                    <span className="font-semibold">
                      {request.targetSegments.join(', ')}
                    </span>
                  </p>
                </div>
                <div className="text-xs text-slate-300 md:text-right space-y-1">
                  <p>
                    Scheduled for{' '}
                    <span className="font-semibold">
                      {request.scheduledAt
                        ? new Date(request.scheduledAt).toLocaleString()
                        : 'Not set'}
                    </span>
                  </p>
                  <p>
                    Created{' '}
                    <span className="font-semibold">
                      {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
