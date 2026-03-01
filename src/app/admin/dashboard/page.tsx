// src/app/admin/dashboard/page.tsx

import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  Users,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  CreditCard,
} from 'lucide-react';
import UnauthorizedPage from '@/app/unauthorized/page';
import { getTexifyBalance } from '@/lib/texify';

export const dynamic = 'force-dynamic';

async function getStats(ministryId?: string) {
  const where = ministryId ? { ministryId } : {};
  const [
    totalContacts,
    totalRequests,
    pendingRequests,
    sentMessages,
    rejectedMessages,
    totalMinistries,
  ] = await Promise.all([
    prisma.contact.count({ 
      where: { 
        isActive: true,
        ...(ministryId ? { ministries: { some: { id: ministryId } } } : {})
      } 
    }),
    prisma.messageRequest.count({ where }),
    prisma.messageRequest.count({ where: { ...where, status: 'PENDING' } }),
    prisma.messageRequest.count({ where: { ...where, status: 'SENT' } }),
    prisma.messageRequest.count({ where: { ...where, status: 'REJECTED' } }),
    prisma.ministry.count(),
  ]);

  return {
    totalContacts,
    totalRequests,
    pendingRequests,
    sentMessages,
    rejectedMessages,
    totalMinistries,
  };
}

async function getRecentPending(ministryId?: string) {
  const where = ministryId ? { ministryId, status: 'PENDING' } : { status: 'PENDING' };
  // @ts-ignore
  return prisma.messageRequest.findMany({
    // @ts-ignore
    where,
    include: { ministry: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MINISTRY_HEAD')) {
    return <UnauthorizedPage />;
  }
  
  const isMinistryHead = session.user.role === 'MINISTRY_HEAD';
  const ministryId = isMinistryHead ? session.user.ministryId || undefined : undefined;

  let balance = 'N/A';
  if (!isMinistryHead) {
    try {
      const balanceData = await getTexifyBalance();
      if (balanceData && typeof balanceData.balance !== 'undefined') {
        const currency = balanceData.currency || 'GHS';
        balance =
          currency === 'Credits'
            ? `${balanceData.balance} Credits`
            : `${currency} ${balanceData.balance}`;
      }
    } catch (error) {
      console.error('Failed to fetch Texify balance:', error);
    }
  }

  const stats = await getStats(ministryId);
  type PendingRequest = {
    id: string;
    programName: string;
    createdAt: Date;
    ministry: { name: string };
  };
  const pendingRequests = (await getRecentPending(ministryId)) as unknown as PendingRequest[];

  const statCards = [
    ...(!isMinistryHead
      ? [
          {
            label: 'SMS Balance',
            value: balance,
            icon: CreditCard,
            color: 'bg-emerald-600/20 text-emerald-400',
          },
        ]
      : []),
    {
      label: 'Total Members',
      value: stats.totalContacts,
      icon: Users,
      color: 'bg-blue-600/20 text-blue-400',
      href: isMinistryHead ? undefined : '/admin/contacts',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests,
      icon: Clock,
      color: 'bg-yellow-600/20 text-yellow-400',
      href: '/admin/requests?status=PENDING',
    },
    {
      label: 'Messages Sent',
      value: stats.sentMessages,
      icon: CheckCircle2,
      color: 'bg-green-600/20 text-green-400',
      href: '/admin/requests?status=SENT',
    },
    {
      label: 'Rejected',
      value: stats.rejectedMessages,
      icon: XCircle,
      color: 'bg-red-600/20 text-red-400',
      href: '/admin/requests?status=REJECTED',
    },
    {
      label: 'Total Requests',
      value: stats.totalRequests,
      icon: MessageSquare,
      color: 'bg-purple-600/20 text-purple-400',
      href: '/admin/requests',
    },
    ...(!isMinistryHead
      ? [
          {
            label: 'Ministries',
            value: stats.totalMinistries,
            icon: Users,
            color: 'bg-indigo-600/20 text-indigo-400',
            href: '/admin/ministries',
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {session?.user?.name}
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s what&apos;s happening across your ministries.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          const CardContent = (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {card.value}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}
              >
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );

          return (
            <div
              key={card.label}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-colors hover:bg-white/10"
            >
              {card.href ? (
                <Link href={card.href} className="block h-full">
                  {CardContent}
                </Link>
              ) : (
                CardContent
              )}
            </div>
          );
        })}
      </div>

      {/* Pending Requests */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">
            Pending Approval
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">
            No pending requests. All caught up!
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between bg-white/5 rounded-xl p-4"
              >
                <div>
                  <p className="text-white font-medium">{req.programName}</p>
                  <p className="text-sm text-slate-400">
                    {req.ministry.name} •{' '}
                    {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
