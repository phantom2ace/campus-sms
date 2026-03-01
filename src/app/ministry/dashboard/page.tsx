// src/app/ministry/dashboard/page.tsx

import UnauthorizedPage from '@/app/unauthorized/page';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MessageSquare, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

export default async function MinistryDashboard() {
  const session = await getServerSession(authOptions);
  const ministryId = session?.user?.ministryId;

  if (session?.user?.role !== 'MINISTRY_HEAD') {
    return <UnauthorizedPage />;
  }
  const [pending, approved, rejected, total] = await Promise.all([
    prisma.messageRequest.count({
      where: { ministryId: ministryId!, status: 'PENDING' },
    }),
    prisma.messageRequest.count({
      where: { ministryId: ministryId!, status: 'SENT' },
    }),
    prisma.messageRequest.count({
      where: { ministryId: ministryId!, status: 'REJECTED' },
    }),
    prisma.messageRequest.count({
      where: { ministryId: ministryId! },
    }),
  ]);

  const recentRequests = await prisma.messageRequest.findMany({
    where: { ministryId: ministryId! },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    APPROVED: 'bg-blue-500/20 text-blue-400',
    SENT: 'bg-green-500/20 text-green-400',
    REJECTED: 'bg-red-500/20 text-red-400',
    SCHEDULED: 'bg-purple-500/20 text-purple-400',
    PARTIALLY_FAILED: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {session?.user?.ministryName}
        </h1>
        <p className="text-slate-400 mt-1">
          Welcome, {session?.user?.name}. Manage your SMS requests below.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Requests', value: total, icon: MessageSquare, color: 'bg-blue-600/20 text-blue-400' },
          { label: 'Pending', value: pending, icon: Clock, color: 'bg-yellow-600/20 text-yellow-400' },
          { label: 'Sent', value: approved, icon: CheckCircle2, color: 'bg-green-600/20 text-green-400' },
          { label: 'Rejected', value: rejected, icon: XCircle, color: 'bg-red-600/20 text-red-400' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Action */}
      <div className="mb-8">
        <Link
          href="/ministry/request"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          Submit New SMS Request
        </Link>
      </div>

      {/* Recent Requests */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Requests
        </h2>
        {recentRequests.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No requests yet. Submit your first SMS request above.
          </p>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((req: Awaited<ReturnType<typeof prisma.messageRequest.findMany>>[number]) => (
              <div
                key={req.id}
                className="flex items-center justify-between bg-white/5 rounded-xl p-4"
              >
                <div>
                  <p className="text-white font-medium">{req.programName}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    statusColor[req.status] || 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {req.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
