'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';

export default function TestCallButton({ botId, metadata }: { botId: string; metadata?: Record<string, string> }) {
  const [phone, setPhone] = useState('');
  const [open, setOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleCall() {
    if (!phone.trim()) return;
    setCalling(true);
    setResult(null);

    try {
      const res = await fetch('/api/bots/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botId, phone, metadata }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `Calling ${data.to}...` });
      } else {
        setResult({ ok: false, message: data.error || 'Failed to initiate call' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error' });
    } finally {
      setCalling(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white text-xs font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
      >
        <Phone size={12} />
        Test Call
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Your phone number"
        className="bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono w-40"
      />
      <button
        onClick={handleCall}
        disabled={calling || !phone.trim()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        <Phone size={12} />
        {calling ? 'Calling...' : 'Call Now'}
      </button>
      <button
        onClick={() => { setOpen(false); setResult(null); }}
        className="px-2 py-1.5 text-gray-500 hover:text-gray-300 text-xs"
      >
        Cancel
      </button>
      {result && (
        <span className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}
