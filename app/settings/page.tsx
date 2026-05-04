'use client';

import { useState, useEffect } from 'react';
import { Copy, Trash2, Plus, Link2, Save, Check, Key } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Invite = { id: string; token: string; email: string | null; role: string; used: boolean; expires_at: string; created_at: string };

export default function SettingsPage() {
  const [userId, setUserId] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');

  // API Keys state
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);

  useEffect(() => {
    loadInvites();
    // Get current user and load their keys
    createBrowserClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        loadKeys(data.user.id);
      }
    });
  }, []);

  async function loadKeys(uid: string) {
    const res = await fetch(`/api/user-keys?user_id=${uid}`);
    if (res.ok) { const data = await res.json(); setKeys(data.keys || {}); }
  }

  async function saveKeys() {
    if (!userId) return;
    setSavingKeys(true);
    setKeysSaved(false);
    const res = await fetch('/api/user-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...keys }),
    });
    if (res.ok) { setKeysSaved(true); setTimeout(() => setKeysSaved(false), 3000); await loadKeys(userId); }
    setSavingKeys(false);
  }

  function updateKey(field: string, value: string) {
    setKeys(prev => ({ ...prev, [field]: value }));
  }

  async function loadInvites() {
    try { const res = await fetch('/api/invites'); const data = await res.json(); setInvites(data.invites || []); } catch {}
  }
  async function createInvite() {
    setCreating(true);
    try { const res = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail || null }) }); if (res.ok) { setNewEmail(''); await loadInvites(); } } finally { setCreating(false); }
  }
  async function deleteInvite(id: string) { await fetch(`/api/invites?id=${id}`, { method: 'DELETE' }); await loadInvites(); }
  function copyLink(token: string) { navigator.clipboard.writeText(`${window.location.origin}/invite?token=${token}`); setCopied(token); setTimeout(() => setCopied(''), 2000); }

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6 max-w-3xl">
        {/* API Keys */}
        <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Key size={14} /> API Keys</h3>
              <p className="text-xs text-gray-600 mt-0.5">Save your provider keys here. They auto-populate when creating new bots.</p>
            </div>
            <button onClick={saveKeys} disabled={savingKeys} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              {keysSaved ? <><Check size={12} /> Saved</> : savingKeys ? 'Saving...' : <><Save size={12} /> Save Keys</>}
            </button>
          </div>

          {/* Cartesia (Primary) */}
          <div className="mb-5">
            <h4 className="text-xs text-gray-500 uppercase mb-3">Cartesia (Voice Agent Platform)</h4>
            <div className="grid grid-cols-1 gap-3">
              <KeyField label="Cartesia API Key" field="cartesia_api_key" value={keys.cartesia_api_key} onChange={updateKey} placeholder="your-cartesia-api-key" />
            </div>
            <p className="text-[10px] text-gray-600 mt-2">Required for bot listing, test calls, and campaign launches.</p>
          </div>

          {/* AI Models */}
          <div className="mb-5">
            <h4 className="text-xs text-gray-500 uppercase mb-3">AI Model Providers</h4>
            <div className="grid grid-cols-2 gap-3">
              <KeyField label="Anthropic API Key" field="anthropic_api_key" value={keys.anthropic_api_key} onChange={updateKey} placeholder="sk-ant-api03-..." />
              <KeyField label="OpenAI API Key" field="openai_api_key" value={keys.openai_api_key} onChange={updateKey} placeholder="sk-..." />
            </div>
          </div>

          {/* Voice Providers */}
          <div className="mb-5">
            <h4 className="text-xs text-gray-500 uppercase mb-3">Other Voice (TTS) Providers</h4>
            <div className="grid grid-cols-2 gap-3">
              <KeyField label="ElevenLabs API Key" field="elevenlabs_api_key" value={keys.elevenlabs_api_key} onChange={updateKey} placeholder="sk_..." />
              <KeyField label="Deepgram API Key" field="deepgram_api_key" value={keys.deepgram_api_key} onChange={updateKey} placeholder="Token..." />
              <KeyField label="PlayHT API Key" field="playht_api_key" value={keys.playht_api_key} onChange={updateKey} placeholder="API Key" />
            </div>
          </div>

          {/* Phone Providers */}
          <div className="mb-5">
            <h4 className="text-xs text-gray-500 uppercase mb-3">Telnyx</h4>
            <div className="grid grid-cols-3 gap-3">
              <KeyField label="API Key" field="telnyx_api_key" value={keys.telnyx_api_key} onChange={updateKey} placeholder="KEY..." />
              <KeyField label="Connection ID" field="telnyx_connection_id" value={keys.telnyx_connection_id} onChange={updateKey} plain />
              <KeyField label="Phone Number" field="telnyx_phone_number" value={keys.telnyx_phone_number} onChange={updateKey} placeholder="+18005551234" plain />
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-xs text-gray-500 uppercase mb-3">Twilio</h4>
            <div className="grid grid-cols-3 gap-3">
              <KeyField label="Account SID" field="twilio_account_sid" value={keys.twilio_account_sid} onChange={updateKey} placeholder="AC..." plain />
              <KeyField label="Auth Token" field="twilio_auth_token" value={keys.twilio_auth_token} onChange={updateKey} placeholder="Auth Token" />
              <KeyField label="Phone Number" field="twilio_phone_number" value={keys.twilio_phone_number} onChange={updateKey} placeholder="+18005551234" plain />
            </div>
          </div>

          <div>
            <h4 className="text-xs text-gray-500 uppercase mb-3">SignalWire</h4>
            <div className="grid grid-cols-2 gap-3">
              <KeyField label="Project ID" field="signalwire_project_id" value={keys.signalwire_project_id} onChange={updateKey} placeholder="a1b2c3d4-..." plain />
              <KeyField label="API Token" field="signalwire_api_token" value={keys.signalwire_api_token} onChange={updateKey} placeholder="PT..." />
              <KeyField label="Space URL" field="signalwire_space_url" value={keys.signalwire_space_url} onChange={updateKey} placeholder="yourspace.signalwire.com" plain />
              <KeyField label="Phone Number" field="signalwire_phone_number" value={keys.signalwire_phone_number} onChange={updateKey} placeholder="+18005551234" plain />
            </div>
          </div>
        </div>

        {/* Team Invites */}
        <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Team Invites</h3>
              <p className="text-xs text-gray-600 mt-0.5">Create invite links for team members. Links expire in 7 days.</p>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email (optional)" className="flex-1 px-3 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
            <button onClick={createInvite} disabled={creating} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              <Plus size={12} /> {creating ? 'Creating...' : 'Create Link'}
            </button>
          </div>
          {invites.length > 0 ? (
            <div className="space-y-2">
              {invites.map(inv => {
                const expired = new Date(inv.expires_at) < new Date();
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-[#0B1120] rounded-lg border border-gray-800">
                    <div className="flex items-center gap-3">
                      <Link2 size={14} className={inv.used ? 'text-gray-700' : expired ? 'text-yellow-600' : 'text-cyan-400'} />
                      <div>
                        <div className="text-xs text-gray-300 font-mono">{inv.email || 'Open invite'}</div>
                        <div className="text-[10px] text-gray-600">{inv.used ? 'Used' : expired ? 'Expired' : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!inv.used && !expired && (
                        <button onClick={() => copyLink(inv.token)} className="flex items-center gap-1 px-2 py-1 text-[10px] text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-colors">
                          <Copy size={10} /> {copied === inv.token ? 'Copied!' : 'Copy Link'}
                        </button>
                      )}
                      <button onClick={() => deleteInvite(inv.id)} className="p-1 text-gray-700 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-xs text-gray-700 text-center py-3">No invite links created yet</p>}
        </div>
      </div>
    </div>
  );
}

function KeyField({ label, field, value, onChange, placeholder, plain }: { label: string; field: string; value: string; onChange: (f: string, v: string) => void; placeholder?: string; plain?: boolean }) {
  const isSet = value && value.startsWith('••••');
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase">{label}</span>
        {isSet && <span className="text-[9px] text-emerald-500">SET</span>}
      </div>
      <input
        type={plain ? 'text' : 'password'}
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
        placeholder={isSet ? 'Enter new to update' : placeholder}
        className="w-full mt-1 bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono"
      />
    </label>
  );
}
