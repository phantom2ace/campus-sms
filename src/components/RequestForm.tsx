'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type Segment = {
  id: string;
  name: string;
};

type Props = {
  segments: Segment[];
};

export default function RequestForm({ segments }: Props) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isMinistryHead = userRole === 'MINISTRY_HEAD';

  const [programName, setProgramName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [specificPhoneNumbers, setSpecificPhoneNumbers] = useState('');
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Cost estimation state
  const [recipientCount, setRecipientCount] = useState(0);
  const [calculatingCount, setCalculatingCount] = useState(false);

  const levels = ['100', '200', '300', '400', '500'];

  // Update recipient count when selection changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      const parsedPhoneNumbers = specificPhoneNumbers
        .split(/[\n,]+/)
        .map(num => num.trim())
        .filter(num => num.length > 0);

      if (selectedSegments.length === 0 && selectedLevels.length === 0 && parsedPhoneNumbers.length === 0) {
        setRecipientCount(0);
        return;
      }

      setCalculatingCount(true);
      try {
        const res = await fetch('/api/contacts/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetSegments: selectedSegments,
            targetLevels: selectedLevels,
            specificPhoneNumbers: parsedPhoneNumbers,
          }),
        });
        const data = await res.json();
        setRecipientCount(data.count || 0);
      } catch (err) {
        console.error('Failed to fetch count:', err);
      } finally {
        setCalculatingCount(false);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [selectedSegments, selectedLevels, specificPhoneNumbers]);

  const calculateCredits = () => {
    if (!messageContent || recipientCount === 0) return 0;
    
    // Standard SMS is 160 characters. 
    // Multi-part SMS are 153 characters per part.
    const len = messageContent.length;
    let parts = 1;
    if (len > 160) {
      parts = Math.ceil(len / 153);
    }
    return parts * recipientCount;
  };

  // Default to all levels for Ministry Heads to ensure validation passes
  useEffect(() => {
    if (isMinistryHead) {
      setSelectedLevels(levels);
      // Ensure sendImmediately is false so it goes to PENDING (though API enforces this too)
      // Actually, API enforces that ministry heads can't send immediately.
      // But we want the UI to reflect "Submit Request" not "Send Immediately".
      // We can leave sendImmediately as true, and let the API handle the PENDING status.
      // Or we can set it to false but then we need a scheduled date?
      // No, sendImmediately=true for Ministry Head just means "I want this sent now (once approved)".
      // The API logic I wrote:
      // if (sendImmediately && user.role === 'ADMIN') { send }
      // else { just create (PENDING) }
      // So keeping sendImmediately=true is fine, it just won't actually send immediately.
    }
  }, [isMinistryHead]);

  const toggleSegment = (name: string) => {
    setSelectedSegments((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleAllLevels = () => {
    if (selectedLevels.length === levels.length) {
      setSelectedLevels([]);
    } else {
      setSelectedLevels([...levels]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Parse specific phone numbers
    const parsedPhoneNumbers = specificPhoneNumbers
      .split(/[\n,]+/)
      .map(num => num.trim())
      .filter(num => num.length > 0);

    if (!programName || !messageContent || (selectedSegments.length === 0 && selectedLevels.length === 0 && parsedPhoneNumbers.length === 0)) {
      setError('Program name, message and at least one recipient group, level, or specific number are required.');
      return;
    }
    if (!sendImmediately && !scheduledAt) {
      setError('Select a date and time for scheduled messages.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programName,
          messageContent,
          targetSegments: selectedSegments,
          targetLevels: selectedLevels,
          specificPhoneNumbers: parsedPhoneNumbers,
          sendImmediately,
          scheduledAt: sendImmediately ? null : scheduledAt,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to submit request.');
      } else {
        if (data.status === 'SENT') {
          setSuccess('Request sent successfully.');
        } else if (data.status === 'SCHEDULED') {
          setSuccess('Request scheduled successfully.');
        } else {
          setSuccess('Request submitted for approval.');
        }
        setProgramName('');
        setMessageContent('');
        setSelectedSegments([]);
        setSelectedLevels([]);
        setSpecificPhoneNumbers('');
        setSendImmediately(true);
        setScheduledAt('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Program Name
        </label>
        <input
          type="text"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tuesday Chapel Reminder"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Message Content
        </label>
        <textarea
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
          placeholder="Type the SMS message to send to students."
        />
        <p className="mt-1 text-xs text-slate-500">
          Keep it short and clear. Standard SMS length applies.
        </p>
      </div>
      {!isMinistryHead && (
        <>
          <div>
            <p className="block text-sm font-medium text-slate-200 mb-2">
              Recipients
            </p>
            <div className="flex flex-wrap gap-2">
              {segments.map((segment) => {
                const selected = selectedSegments.includes(segment.name);
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => toggleSegment(segment.name)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:border-blue-500'
                    }`}
                  >
                    {segment.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Select one or more recipient groups, or all to reach the entire church.
            </p>
          </div>
          <div>
            <p className="block text-sm font-medium text-slate-200 mb-2">
              Target Levels
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleAllLevels}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedLevels.length === levels.length
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-300 border-white/10 hover:border-blue-500'
                }`}
              >
                All
              </button>
              {levels.map((level) => {
                const selected = selectedLevels.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleLevel(level)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:border-blue-500'
                    }`}
                  >
                    Level {level}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Select levels to target specific academic years.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Specific Phone Numbers (Optional)
            </label>
            <textarea
              value={specificPhoneNumbers}
              onChange={(e) => setSpecificPhoneNumbers(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Enter phone numbers separated by commas or new lines (e.g., 0541234567, 0209876543)"
            />
            <p className="mt-1 text-xs text-slate-500">
              Add extra numbers that are not in the database.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSendImmediately(true)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  sendImmediately
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-300 border-white/10 hover:border-blue-500'
                }`}
              >
                Send Immediately
              </button>
              <button
                type="button"
                onClick={() => setSendImmediately(false)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  !sendImmediately
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-300 border-white/10 hover:border-blue-500'
                }`}
              >
                Schedule
              </button>
            </div>
            {!sendImmediately && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Scheduled Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </>
      )}
      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-400">
          {success}
        </p>
      )}

      {/* Cost Estimation Box */}
      {(recipientCount > 0 || calculatingCount) && (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Estimated Recipients:</span>
            <span className="text-blue-400 font-medium">
              {calculatingCount ? 'Calculating...' : recipientCount}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Message Parts:</span>
            <span className="text-blue-400 font-medium">
              {messageContent ? (messageContent.length > 160 ? Math.ceil(messageContent.length / 153) : 1) : 0}
            </span>
          </div>
          <div className="pt-2 border-t border-blue-500/10 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-200">Total Estimated Credits:</span>
            <span className="text-sm font-bold text-blue-400">
              {calculatingCount ? '...' : calculateCredits()}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 italic">
            * 1 credit per recipient for every 160 characters. Long messages (>160 chars) use 153 chars per part.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 disabled:bg-blue-600/40 rounded-xl text-white text-sm font-medium hover:bg-blue-700 transition-colors w-full"
      >
        {submitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}

