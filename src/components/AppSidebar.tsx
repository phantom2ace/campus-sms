
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  BarChart3,
  Archive,
  Building2,
  FileText,
  LogOut,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'MINISTRY_HEAD'],
  },
  {
    title: 'New Message',
    href: '/admin/messages/new',
    icon: MessageSquare,
    roles: ['ADMIN', 'MINISTRY_HEAD'],
  },
  {
    title: 'Requests',
    href: '/admin/requests',
    icon: FileText,
    roles: ['ADMIN', 'MINISTRY_HEAD'],
  },
  {
    title: 'Ministries',
    href: '/admin/ministries',
    icon: Building2,
    roles: ['ADMIN'],
  },
  {
    title: 'Contacts',
    href: '/admin/contacts',
    icon: Users,
    roles: ['ADMIN', 'MINISTRY_HEAD'],
  },
  {
    title: 'Scheduled',
    href: '/admin/scheduled',
    icon: Calendar,
    roles: ['ADMIN'],
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
    roles: ['ADMIN'],
  },
  {
    title: 'Archive',
    href: '/admin/archive',
    icon: Archive,
    roles: ['ADMIN'],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (userRole === 'ADMIN') {
      const fetchPending = async () => {
        try {
          const res = await fetch('/api/requests?status=PENDING');
          if (res.ok) {
            const data = await res.json();
            setPendingRequests(Array.isArray(data) ? data.length : 0);
          }
        } catch (error) {
          console.error('Failed to fetch pending requests', error);
        }
      };
      
      fetchPending();
      // Poll every 60 seconds
      const interval = setInterval(fetchPending, 60000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  return (
    <div className="flex flex-col w-64 h-full border-r border-slate-800 bg-slate-900/50 text-slate-100 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Campus SMS
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {userRole === 'ADMIN' ? 'Admin Portal' : 'Ministry Portal'}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {sidebarItems
          .filter((item) => userRole && item.roles.includes(userRole as string))
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            let title = item.title;
            if (item.title === 'New Message' && userRole === 'MINISTRY_HEAD') {
              title = 'New Request';
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                )}
              >
                <div className="flex items-center">
                  <Icon className="w-5 h-5 mr-3" />
                  {title}
                </div>
                {item.title === 'Requests' && userRole === 'ADMIN' && pendingRequests > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingRequests}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
