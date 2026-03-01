// src/app/ministry/layout.tsx

import Sidebar from '@/components/AppSidebar';

export default function MinistryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
