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

  // Transform dates to strings/compatible types if needed for the client component, 
  // though Next.js Server Components serialize Date objects to strings automatically in props.
  // However, TypeScript might complain if the types don't exactly match.
  // Let's cast to any to satisfy the component prop type if needed, or better, update the component type.
  // The error was: Type 'import("@prisma/client").Contact[]' is not assignable to type 'Contact[]'.
  // Type 'Contact' is missing properties name, level, dateOfBirth.
  // This confirms the Prisma Client types seen by TS in this file are stale.
  // We'll cast to any as a temporary workaround until VS Code picks up the new types fully.
  
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
      <ContactTable contacts={contacts as any} />
    </div>
  );
}

