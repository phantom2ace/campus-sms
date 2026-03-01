'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import AdminRequestCard from '@/components/AdminRequestCard';

type MessageRequest = {
  id: string;
  programName: string;
  messageContent: string;
  targetSegments: string[];
  targetLevels: string[];
  sendImmediately: boolean;
  scheduledAt: string | null;
  createdAt: string;
  ministry: {
    name: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT' | 'SCHEDULED' | 'PARTIALLY_FAILED';
};

function AdminRequestsContent() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status');

  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMinistryHead = session?.user?.role === 'MINISTRY_HEAD';
  const isAdmin = session?.user?.role === 'ADMIN';

  const load = useCallback(async () => {
    if (sessionStatus === 'loading') return;
    
    setLoading(true);
    setError(null);
    try {
      let url = '/api/requests';
      const params = new URLSearchParams();
      
      if (statusParam) {
        params.append('status', statusParam);
      } else if (isAdmin) {
        // Default to PENDING for Admins if no status specified
        params.append('status', 'PENDING');
      }
      
      if (params.toString()) {
          url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to load requests.');
      } else {
        setRequests(data as MessageRequest[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [sessionStatus, statusParam, isAdmin]);

  useEffect(() => {
    load();
  }, [load]); // Reload when session or params change

  if (sessionStatus === 'loading') {
     return <div className="p-6 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {isMinistryHead ? 'My Requests' : 'SMS Requests'}
        </h1>
        <p className="text-slate-400 text-sm">
          {isMinistryHead
            ? 'Track the status of your SMS requests.'
            : 'Review and approve or reject SMS requests from all ministries.'}
        </p>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}
      {loading ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-sm text-slate-400">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-sm text-slate-400">No requests found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <AdminRequestCard
              key={request.id}
              request={request}
              onChanged={load}
              isReadOnly={!isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading requests...</div>}>
      <AdminRequestsContent />
    </Suspense>
  );
}
