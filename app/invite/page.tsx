'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function InvitePage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0B1120]" />}><InviteForm /></Suspense>;
}

function InviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Invalid or missing invite link</p>
          <p className="text-gray-600 text-xs mt-2">Ask your admin for a new invite.</p>
        </div>
      </div>
    );
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create account via server API (bypasses email confirmation)
      const res = await fetch('/api/invites/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // Account created — redirect to login
      window.location.href = '/login';
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Join the Team</h1>
          <p className="text-sm text-gray-500 mt-1">Voice Agent Dashboard</p>
        </div>

        <form onSubmit={handleSignup} className="bg-[#111827] border border-gray-700/50 rounded-2xl p-7 space-y-5">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              placeholder="Your name"
              className="w-full bg-[#0B1120] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full bg-[#0B1120] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Create Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Min 6 characters"
              className="w-full bg-[#0B1120] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name || !email || !password}
            className="w-full py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" /></svg>
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-700 mt-8">
          Already have an account? <a href="/login" className="text-cyan-500 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
