import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UnauthorizedPage from '@/app/unauthorized/page';
import prisma from '@/lib/prisma';

export default async function AdminMinistriesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return <UnauthorizedPage />;
  }

  // Define the type manually to avoid import issues with Prisma namespace
  interface MinistryWithRelations {
    id: string;
    name: string;
    users: { id: string; name: string }[];
    _count: { requests: number };
  }

  const ministries = await prisma.ministry.findMany({
    include: {
      users: true,
      _count: {
        select: { requests: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  }) as unknown as MinistryWithRelations[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Ministries
          </h1>
          <p className="text-slate-400 text-sm">
            Overview of all campus ministries and their coordinators.
          </p>
        </div>
        {/* <Link
          href="/admin/ministries/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add Ministry
        </Link> */}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs uppercase tracking-wide text-slate-400 border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Ministry Head(s)</th>
              <th className="px-6 py-3 font-medium text-center">Requests</th>
              {/* <th className="px-6 py-3 font-medium text-right">Actions</th> */}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {ministries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                  No ministries found.
                </td>
              </tr>
            ) : (
              ministries.map((ministry) => (
                <tr
                  key={ministry.id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {ministry.name}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {ministry.users.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {ministry.users.map((u) => (
                  <span key={u.id} className="text-xs bg-white/10 px-2 py-1 rounded w-fit">
                    {u.name}
                  </span>
                ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400">
                    {ministry._count.requests}
                  </td>
                  {/* <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/ministries/${ministry.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-medium text-xs"
                    >
                      Manage
                    </Link>
                  </td> */}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
