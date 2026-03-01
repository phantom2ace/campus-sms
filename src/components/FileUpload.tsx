'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type UploadResult = {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  skippedDetails?: { phone: string; name?: string; reason: string }[];
};

export default function FileUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      });
      
      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Failed to parse response:', text);
        throw new Error('Server returned invalid response (check console)');
      }

      if (!response.ok) {
        setError(data.details || data.error || 'Upload failed');
      } else {
        setResult(data as UploadResult);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Upload Members Excel
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            setFile(selected);
            setResult(null);
            setError(null);
          }}
          className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-600 disabled:bg-blue-600/40 rounded-xl text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {loading ? 'Uploading...' : 'Upload and Import'}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-400 mt-3">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4 text-sm text-slate-300 space-y-1">
          <p>
            Total rows: <span className="font-semibold">{result.total}</span>
          </p>
          <p>
            Imported new: <span className="font-semibold">{result.imported}</span>
          </p>
          <p>
            Updated existing: <span className="font-semibold">{result.updated}</span>
          </p>
          <p>
            Skipped: <span className="font-semibold text-yellow-400">{result.skipped}</span>
          </p>
        </div>
      )}
      
      {result?.skippedDetails && result.skippedDetails.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <h3 className="text-sm font-medium text-yellow-200 mb-2">Skipped Rows Details</h3>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {result.skippedDetails.map((detail, idx) => (
              <div key={idx} className="text-xs text-yellow-100/80 border-b border-yellow-500/10 pb-1 last:border-0">
                <span className="font-mono">{detail.phone}</span>
                {detail.name && <span className="mx-2">- {detail.name}</span>}
                <span className="text-yellow-400 block sm:inline sm:ml-2">({detail.reason})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

