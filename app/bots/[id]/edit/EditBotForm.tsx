'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw, Play } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Bot = Record<string, unknown>;
type Script = { id: string; name: string; description: string | null };
type LeadList = { id: string; name: string; description: string | null };

export default function EditBotForm({ bot, scripts, leadLists }: { bot: Bot; scripts: Script[]; leadLists: LeadList[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: (bot.name as string) || '',
    model: (bot.model as string) || 'claude-sonnet-4-6',
    voice_provider: (bot.voice_provider as string) || 'elevenlabs',
    phone_provider: (bot.phone_provider as string) || 'telnyx',
    voice_name: (bot.voice_name as string) || '',
    voice_id: (bot.voice_id as string) || '',
    phone_number: (bot.phone_number as string) || '',
    telnyx_connection_id: (bot.telnyx_connection_id as string) || '',
    phone_account_sid: (bot.phone_account_sid as string) || '',
    signalwire_space_url: (bot.signalwire_space_url as string) || (bot.telnyx_connection_id as string) || '',
    script_id: (bot.script_id as string) || '',
    prompt_id: (bot.prompt_id as string) || '',
    max_concurrent: (bot.max_concurrent as number) || 5,
    stability: (bot.stability as number) ?? 0.55,
    similarity_boost: (bot.similarity_boost as number) ?? 0.85,
    style: (bot.style as number) ?? 0.25,
    speed: (bot.speed as number) ?? 1.15,
    lead_list_id: (bot.lead_list_id as string) || '',
    // STT
    stt_provider: (bot.stt_provider as string) || 'telnyx',
    stt_model: (bot.stt_model as string) || 'nova-2',
    // Keys left blank — only sent if user enters new ones
    ai_api_key: '',
    voice_api_key: '',
    phone_api_key: '',
    phone_api_secret: '',
    deepgram_api_key: '',
  });

  function update(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    // Only send non-empty key fields
    const payload: Record<string, unknown> = { ...form };
    if (!payload.ai_api_key) delete payload.ai_api_key;
    if (!payload.voice_api_key) delete payload.voice_api_key;
    if (!payload.phone_api_key) delete payload.phone_api_key;
    if (!payload.phone_api_secret) delete payload.phone_api_secret;
    if (!payload.deepgram_api_key) delete payload.deepgram_api_key;

    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push(`/bots/${bot.id}`);
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save');
      }
    } finally { setSaving(false); }
  }

  const isTwilio = form.phone_provider === 'twilio';

  // Voice loading
  const [voices, setVoices] = useState<{voice_id:string;name:string;category:string}[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const loadVoices = useCallback(async () => {
    setLoadingVoices(true);
    setVoiceError('');
    setVoices([]);
    // Use form key, or fall back to saved user key
    let apiKey = form.voice_api_key;
    if (!apiKey) {
      try {
        const { data: { user } } = await createBrowserClient().auth.getUser();
        if (user) {
          const res = await fetch('/api/user-keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) });
          const d = await res.json();
          const providerKeyMap: Record<string, string> = { elevenlabs: 'elevenlabs_api_key', cartesia: 'cartesia_api_key', deepgram: 'deepgram_api_key', playht: 'playht_api_key' };
          apiKey = d.keys?.[providerKeyMap[form.voice_provider] || 'elevenlabs_api_key'] || '';
        }
      } catch {}
    }
    if (!apiKey) { setVoiceError('No API key — enter one above or save in Settings'); setLoadingVoices(false); return; }
    try {
      const res = await fetch(`/api/voices?provider=${form.voice_provider}&api_key=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if (!res.ok) { setVoiceError(data.error || 'Failed'); setLoadingVoices(false); return; }
      setVoices(data.voices || []);
    } catch { setVoiceError('Network error'); } finally { setLoadingVoices(false); }
  }, [form.voice_api_key, form.voice_provider]);

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
      <Section title="Identity">
        <Field label="Bot Name">
          <Input value={form.name} onChange={v => update('name', v)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="AI Model">
            <select value={form.model} onChange={e => update('model', e.target.value)} className="w-full bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
          </Field>
          <Field label="Max Concurrent">
            <Input type="number" value={form.max_concurrent.toString()} onChange={v => update('max_concurrent', parseInt(v) || 1)} />
          </Field>
        </div>
        <Field label="AI API Key (leave blank to keep current)">
          <Input value={form.ai_api_key} onChange={v => update('ai_api_key', v)} placeholder="Enter new key to update" type="password" />
        </Field>
      </Section>

      <Section title="Phone Provider">
        <div className="flex gap-2 mb-3">
          {['telnyx', 'twilio', 'signalwire'].map(p => (
            <button key={p} type="button" onClick={() => update('phone_provider', p)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${form.phone_provider === p ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-700/50 bg-[#0B1120] text-gray-400'}`}>
              {p === 'signalwire' ? 'SignalWire' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        {isTwilio ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Account SID"><Input value={form.phone_account_sid} onChange={v => update('phone_account_sid', v)} placeholder="AC..." /></Field>
            <Field label="Auth Token (blank = keep)"><Input value={form.phone_api_secret} onChange={v => update('phone_api_secret', v)} type="password" placeholder="Enter new to update" /></Field>
          </div>
        ) : form.phone_provider === 'signalwire' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Project ID"><Input value={form.phone_account_sid} onChange={v => update('phone_account_sid', v)} placeholder="a1b2c3d4-..." /></Field>
              <Field label="API Token (blank = keep)"><Input value={form.phone_api_secret} onChange={v => update('phone_api_secret', v)} type="password" placeholder="Enter new to update" /></Field>
            </div>
            <Field label="Space URL"><Input value={form.signalwire_space_url} onChange={v => update('signalwire_space_url', v)} placeholder="yourspace.signalwire.com" /></Field>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="API Key (blank = keep)"><Input value={form.phone_api_key} onChange={v => update('phone_api_key', v)} type="password" placeholder="Enter new to update" /></Field>
            <Field label="Connection ID"><Input value={form.telnyx_connection_id} onChange={v => update('telnyx_connection_id', v)} /></Field>
          </div>
        )}
        <Field label="Phone Number (From)"><Input value={form.phone_number} onChange={v => update('phone_number', v)} placeholder="+18005551234" /></Field>
      </Section>

      <Section title="Voice">
        <div className="flex gap-2 mb-3">
          {['elevenlabs', 'playht', 'cartesia', 'deepgram'].map(p => (
            <button key={p} type="button" onClick={() => update('voice_provider', p)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${form.voice_provider === p ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-700/50 bg-[#0B1120] text-gray-400'}`}>
              {p === 'elevenlabs' ? 'ElevenLabs' : p === 'playht' ? 'PlayHT' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Voice API Key (blank = use saved)"><Input value={form.voice_api_key} onChange={v => update('voice_api_key', v)} type="password" placeholder="Enter new or leave blank" /></Field>
          <div className="flex items-end">
            <button type="button" onClick={loadVoices} disabled={loadingVoices} className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white text-xs font-semibold rounded-lg hover:bg-cyan-500 disabled:opacity-50 transition-colors">
              <RefreshCw size={12} className={loadingVoices ? 'animate-spin' : ''} />
              {loadingVoices ? 'Loading...' : 'Load Voices'}
            </button>
          </div>
        </div>
        {voiceError && <p className="text-xs text-red-400 mt-1">{voiceError}</p>}
        {voices.length > 0 && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto mt-2">
            {voices.map(v => (
              <button key={v.voice_id} type="button" onClick={() => setForm(prev => ({ ...prev, voice_id: v.voice_id, voice_name: v.name }))}
                className={`text-left p-2 rounded-lg border text-xs transition-all ${form.voice_id === v.voice_id ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-700/50 bg-[#0B1120] text-gray-400 hover:border-gray-600'}`}>
                <div className="font-medium text-gray-200">{v.name}</div>
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <Field label="Voice Name"><Input value={form.voice_name} onChange={v => update('voice_name', v)} /></Field>
          <Field label="Voice ID"><Input value={form.voice_id} onChange={v => update('voice_id', v)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <Slider label="Stability" value={form.stability} onChange={v => update('stability', v)} />
          <Slider label="Similarity" value={form.similarity_boost} onChange={v => update('similarity_boost', v)} />
          <Slider label="Style" value={form.style} onChange={v => update('style', v)} />
          <Slider label="Speed" value={form.speed} min={0.5} max={2} onChange={v => update('speed', v)} />
        </div>
      </Section>

      <Section title="Transcription (STT)">
        <p className="text-xs text-gray-600">Telnyx engine B is bundled and free; Deepgram is more accurate (mandatory for SignalWire bots).</p>
        <div className="flex gap-2">
          {[{ value: 'telnyx', label: 'Telnyx engine B' }, { value: 'deepgram', label: 'Deepgram nova-2' }].map(p => (
            <button key={p.value} type="button" onClick={() => update('stt_provider', p.value)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${form.stt_provider === p.value ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-700/50 bg-[#0B1120] text-gray-400'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {form.stt_provider === 'deepgram' && (
          <>
            <Field label="Deepgram API Key (blank = keep)">
              <Input value={form.deepgram_api_key} onChange={v => update('deepgram_api_key', v)} type="password" placeholder="Enter new to update" />
            </Field>
            <Field label="Model">
              <select value={form.stt_model} onChange={e => update('stt_model', e.target.value)}
                className="w-full bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                <option value="nova-2">nova-2 (recommended)</option>
                <option value="nova-3">nova-3</option>
                <option value="nova">nova</option>
                <option value="enhanced">enhanced</option>
                <option value="base">base</option>
              </select>
            </Field>
          </>
        )}
        {form.phone_provider === 'signalwire' && form.stt_provider !== 'deepgram' && (
          <p className="text-xs text-amber-400">SignalWire calls require Deepgram STT — switch to Deepgram or this bot won&apos;t transcribe.</p>
        )}
      </Section>

      <Section title="Lead Pool">
        <p className="text-xs text-gray-600 mb-2">Which lead list should this bot dial from?</p>
        <div className="space-y-2">
          <button type="button" onClick={() => setForm(prev => ({ ...prev, lead_list_id: '' }))}
            className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${!form.lead_list_id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 bg-[#0B1120] hover:border-gray-600'}`}>
            <span className="text-gray-200 font-medium">All Leads</span>
            <span className="text-gray-600 ml-2">Dial from the entire pool</span>
          </button>
          {leadLists.map(l => (
            <button key={l.id} type="button" onClick={() => setForm(prev => ({ ...prev, lead_list_id: l.id }))}
              className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${form.lead_list_id === l.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 bg-[#0B1120] hover:border-gray-600'}`}>
              <span className="text-gray-200 font-medium">{l.name}</span>
              {l.description && <span className="text-gray-600 ml-2">{l.description}</span>}
            </button>
          ))}
        </div>
        {leadLists.length === 0 && <p className="text-xs text-gray-600 mt-2">No lead lists uploaded yet.</p>}
      </Section>

      <Section title="Script">
        {scripts.length > 0 ? (
          <div className="space-y-2">
            {scripts.map(s => (
              <button key={s.id} type="button" onClick={() => setForm(prev => ({ ...prev, script_id: s.id, prompt_id: s.name }))}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${form.script_id === s.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 bg-[#0B1120] hover:border-gray-600'}`}>
                <span className="text-gray-200 font-medium">{s.name}</span>
                {s.description && <span className="text-gray-600 ml-2">{s.description}</span>}
              </button>
            ))}
          </div>
        ) : <p className="text-xs text-gray-600">No scripts available</p>}
      </Section>

      <button type="submit" disabled={saving || !form.name.trim()} className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors">
        <span className="flex items-center gap-2"><Save size={14} />{saving ? 'Saving...' : 'Save Changes'}</span>
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-[#111827] rounded-xl border border-gray-700/50 p-5 space-y-4"><h2 className="text-sm font-semibold text-white">{title}</h2>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-gray-500 uppercase">{label}</span><div className="mt-1">{children}</div></label>;
}
function Input({ value, onChange, placeholder, type }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono" />;
}
function Slider({ label, value, onChange, min = 0, max = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <label className="block">
      <div className="flex justify-between"><span className="text-xs text-gray-500 uppercase">{label}</span><span className="text-xs text-cyan-400 font-mono">{value.toFixed(2)}</span></div>
      <input type="range" min={min} max={max} step={0.05} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full mt-1.5 accent-cyan-500" />
    </label>
  );
}
