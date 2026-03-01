import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UnauthorizedPage from '@/app/unauthorized/page';
import prisma from '@/lib/prisma';

export default async function AdminArchivePage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return <UnauthorizedPage />;
  }

  const requests = await prisma.messageRequest.findMany({
    include: { ministry: true, deliveries: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Message Archive
        </h1>
        <p className="text-slate-400 text-sm">
          Permanent record of all SMS communications across all ministries.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">
            No messages have been recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request: (typeof requests)[number]) => {
              const delivered = request.deliveries.filter(
                (d: { status: string }) => d.status === 'DELIVERED'
              ).length;
              const failed = request.deliveries.filter(
                (d: { status: string }) => d.status === 'FAILED'
              ).length;
              const total = request.deliveries.length;
              return (
                <div
                  key={request.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white/5 rounded-xl p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {request.programName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {request.ministry.name} •{' '}
                      {new Date(request.createdAt).toLocaleString()}
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
                      Status:{' '}
                      <span className="font-semibold">
                        {request.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p>
                      Delivered:{' '}
                      <span className="font-semibold text-green-400">
                        {delivered}
                      </span>{' '}
                      of {total}
                    </p>
                    <p>
                      Failed:{' '}
                      <span className="font-semibold text-red-400">
                        {failed}
                      </span>
                    </p>
                    <p>
                      Credits used:{' '}
                      <span className="font-semibold">
                        {request.creditsUsed}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
