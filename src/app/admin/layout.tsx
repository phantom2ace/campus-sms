import Sidebar from '@/components/AppSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 h-full overflow-y-auto relative">
        <main className="p-8 min-h-full">{children}</main>
      </div>
    </div>
  );
}
