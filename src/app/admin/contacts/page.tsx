import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UnauthorizedPage from '@/app/unauthorized/page';
import prisma from '@/lib/prisma';
import FileUpload from '@/components/FileUpload';
import ContactTable from '@/components/ContactTable';

export default async function AdminContactsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MINISTRY_HEAD')) {
    return <UnauthorizedPage />;
  }

  try {
    const contacts = await (prisma.contact as any).findMany({
      where: { 
        isActive: true,
        ...(session.user.role === 'MINISTRY_HEAD' ? { ministries: { some: { id: session.user.ministryId } } } : {}),
      },
      include: { 
        segment: true,
        ministries: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Members
          </h1>
          <p className="text-slate-400 text-sm">
            Manage student phone numbers and upload Excel sheets by level.
          </p>
        </div>
        <FileUpload />
        <ContactTable contacts={contacts} />
      </div>
    );
  } catch (error) {
    console.error('Database error in AdminContactsPage:', error);
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
        <h2 className="text-xl font-bold text-red-400 mb-2">Database Connection Error</h2>
        <p className="text-slate-400 mb-4">
          We couldn't load the members list. This usually happens if the database hasn't been updated with the latest columns.
        </p>
        <code className="block p-3 bg-black/40 rounded text-xs text-slate-300 mb-4">
          Try running: npx prisma db push
        </code>
      </div>
    );
  }
}

