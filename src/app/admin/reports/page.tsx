import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UnauthorizedPage from '@/app/unauthorized/page';
import prisma from '@/lib/prisma';

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return <UnauthorizedPage />;
  }

  const requests = await prisma.messageRequest.findMany({
    where: {
      status: {
        in: ['SENT', 'PARTIALLY_FAILED'],
      },
    },
    include: { ministry: true, deliveries: true },
    orderBy: { sentAt: 'desc' },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Delivery Reports
        </h1>
        <p className="text-slate-400 text-sm">
          Track delivery performance and identify numbers that need resending.
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">
            No sent messages yet.
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
              const pending = request.deliveries.filter(
                (d: { status: string }) => d.status === 'PENDING'
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
                      {request.sentAt
                        ? new Date(request.sentAt).toLocaleString()
                        : 'Not sent'}
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
                      Delivered:{' '}
                      <span className="font-semibold text-green-400">
                        {delivered}
                      </span>{' '}
                      of {total}
                    </p>
                    <p>
                      Pending:{' '}
                      <span className="font-semibold text-yellow-400">
                        {pending}
                      </span>
                    </p>
                    <p>
                      Failed:{' '}
                      <span className="font-semibold text-red-400">
                        {failed}
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
