'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

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

type Props = {
  request: MessageRequest;
  onChanged: () => void;
  isReadOnly?: boolean;
};

export default function AdminRequestCard({ request, onChanged, isReadOnly = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // State for modifying target levels before approval
  const [showTargetEdit, setShowTargetEdit] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(request.targetLevels || []);
  const allLevels = ['100', '200', '300', '400', '500'];

  const approve = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/requests/${request.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sendImmediately: request.sendImmediately,
          scheduledAt: request.scheduledAt,
          targetLevels: selectedLevels, // Pass the modified levels
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to approve request.');
      } else {
        setShowTargetEdit(false);
        onChanged();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request.');
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/requests/${request.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to reject request.');
      } else {
        setShowRejectInput(false);
        setRejectionReason('');
        onChanged();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">
            {request.programName}
          </p>
          <p className="text-xs text-slate-400">
            {request.ministry.name} •{' '}
            {new Date(request.createdAt).toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-slate-200 whitespace-pre-line">
            {request.messageContent}
          </p>
          {request.status === 'PENDING' && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
              <span className="font-semibold">Target:</span>{' '}
              {request.targetSegments.length > 0 || request.targetLevels.length > 0
                ? [
                    ...request.targetSegments,
                    ...request.targetLevels.map(l => `Level ${l}`)
                  ].join(', ')
                : 'No specific targets (will fail if not updated)'}
              {/* Note: Ministry Heads default to All Levels, so this should show Level 100, Level 200, etc. */}
            </div>
          )}
        </div>
        <div className="text-xs text-right text-slate-400">
          <p className="mb-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                request.status === 'PENDING'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : request.status === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : request.status === 'REJECTED'
                  ? 'bg-red-500/20 text-red-400'
                  : request.status === 'SENT'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-slate-500/20 text-slate-400'
              }`}
            >
              {request.status.replace('_', ' ')}
            </span>
          </p>
          {request.targetSegments.length > 0 && (
            <p>
              Recipients:{' '}
              <span className="font-semibold">
                {request.targetSegments.join(', ')}
              </span>
            </p>
          )}
          {request.targetLevels.length > 0 && (
            <p className="mt-1">
              Levels:{' '}
              <span className="font-semibold">
                {request.targetLevels.join(', ')}
              </span>
            </p>
          )}
          <p className="mt-1">
            Mode:{' '}
            <span className="font-semibold">
              {request.sendImmediately ? 'Send now' : 'Scheduled'}
            </span>
          </p>
          {!request.sendImmediately && request.scheduledAt && (
            <p className="mt-1">
              At{' '}
              <span className="font-semibold">
                {new Date(request.scheduledAt).toLocaleString()}
              </span>
            </p>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-400">
          {error}
        </p>
      )}
      
      {request.status === 'PENDING' && !isReadOnly && (
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
          {showTargetEdit ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">
                Confirm Recipients (Levels)
              </label>
              <div className="flex flex-wrap gap-2">
                {allLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      if (selectedLevels.includes(level)) {
                        setSelectedLevels(selectedLevels.filter(l => l !== level));
                      } else {
                        setSelectedLevels([...selectedLevels, level]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedLevels.includes(level)
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    Level {level}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTargetEdit(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={approve}
                  disabled={loading || selectedLevels.length === 0}
                  className="px-3 py-1.5 text-xs bg-green-500/20 text-green-300 border border-green-500/50 rounded hover:bg-green-500/30 disabled:opacity-50"
                >
                  Confirm Approval
                </button>
              </div>
            </div>
          ) : showRejectInput ? (
            <div className="space-y-2">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="text-slate-400 text-xs hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={reject}
                  disabled={!rejectionReason.trim() || loading}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Request
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={loading}
                className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={() => setShowTargetEdit(true)}
                disabled={loading}
                className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-500/20 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

