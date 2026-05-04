'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Play } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Voice = {
  voice_id: string;
  name: string;
  category: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  preview_url: string | null;
};

type Script = {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
};

const VOICE_PROVIDERS = [
  { value: 'elevenlabs', label: 'ElevenLabs', keyPlaceholder: 'sk_...' },
  { value: 'playht', label: 'PlayHT', keyPlaceholder: 'API Key' },
  { value: 'cartesia', label: 'Cartesia', keyPlaceholder: 'API Key' },
  { value: 'deepgram', label: 'Deepgram TTS', keyPlaceholder: 'API Key' },
];

const PHONE_PROVIDERS = [
  { value: 'telnyx', label: 'Telnyx' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'signalwire', label: 'SignalWire' },
];

const AI_MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
];

export default function NewBotPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Voice picker state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Script state
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptMode, setScriptMode] = useState<'existing' | 'new'>('existing');
  const [newScriptName, setNewScriptName] = useState('');
  const [newScriptContent, setNewScriptContent] = useState('');

  // Lead lists
  const [leadLists, setLeadLists] = useState<{ id: string; name: string; description: string | null; lead_count?: number }[]>([]);

  // Current user
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    ai_api_key: '',       // Anthropic or OpenAI key per bot
    voice_provider: 'elevenlabs',
    voice_api_key: '',
    phone_provider: 'telnyx',
    phone_api_key: '',
    phone_api_secret: '',  // Twilio auth token / SignalWire API token
    phone_account_sid: '', // Twilio account SID / SignalWire Project ID
    phone_connection_id: '', // Telnyx connection ID
    signalwire_space_url: '', // SignalWire space URL (e.g. yourorg.signalwire.com)
    phone_number: '',
    voice_id: '',
    voice_name: '',
    script_id: '',
    prompt_id: '',
    lead_list_id: '',
    model: 'claude-sonnet-4-6',
    stability: 0.55,
    similarity_boost: 0.85,
    style: 0.25,
    speed: 1.15,
    max_concurrent: 5,
    // STT (transcription) — defaults to Telnyx engine B; Deepgram is opt-in.
    stt_provider: 'telnyx',
    stt_model: 'nova-2',
    deepgram_api_key: '',
  });

  function update(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Load existing scripts + lead lists + current user
  useEffect(() => {
    fetch('/api/scripts').then(r => r.json()).then(d => setScripts(d.scripts || [])).catch(() => {});
    fetch('/api/lead-lists').then(r => r.json()).then(d => setLeadLists(d.lists || [])).catch(() => {});
    createBrowserClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || data.user.email || '',
        });
        // Auto-populate from saved user keys
        fetch(`/api/user-keys`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: data.user.id }) })
          .then(r => r.json())
          .then(d => {
            const k = d.keys || {};
            setForm(prev => ({
              ...prev,
              ai_api_key: k.anthropic_api_key || k.openai_api_key || prev.ai_api_key,
              voice_api_key: k.elevenlabs_api_key || prev.voice_api_key,
              phone_api_key: k.telnyx_api_key || prev.phone_api_key,
              phone_connection_id: k.telnyx_connection_id || prev.phone_connection_id,
              phone_number: k.telnyx_phone_number || prev.phone_number,
              phone_account_sid: k.twilio_account_sid || prev.phone_account_sid,
              phone_api_secret: k.twilio_auth_token || prev.phone_api_secret,
              signalwire_space_url: k.signalwire_space_url || prev.signalwire_space_url,
              deepgram_api_key: k.deepgram_api_key || prev.deepgram_api_key,
            }));
          })
          .catch(() => {});
      }
    });
  }, []);

  // Fetch voices from provider
  const fetchVoices = useCallback(async () => {
    if (!form.voice_api_key.trim()) {
      setVoiceError(`Enter your ${VOICE_PROVIDERS.find(p => p.value === form.voice_provider)?.label} API key first`);
      return;
    }
    setLoadingVoices(true);
    setVoiceError('');
    setVoices([]);
    try {
      const res = await fetch(`/api/voices?provider=${form.voice_provider}&api_key=${encodeURIComponent(form.voice_api_key)}`);
      const data = await res.json();
      if (!res.ok) {
        setVoiceError(data.error || 'Failed to fetch voices');
        return;
      }
      setVoices(data.voices || []);
      if (data.voices?.length === 0) setVoiceError('No voices found for this API key');
    } catch {
      setVoiceError('Network error');
    } finally {
      setLoadingVoices(false);
    }
  }, [form.voice_api_key, form.voice_provider]);

  function playPreview(url: string) {
    if (previewAudio) previewAudio.pause();
    const audio = new Audio(url);
    audio.play();
    setPreviewAudio(audio);
  }

  function selectVoice(v: Voice) {
    setForm(prev => ({ ...prev, voice_id: v.voice_id, voice_name: v.name }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      let scriptId = form.script_id;
      if (scriptMode === 'new' && newScriptName.trim() && newScriptContent.trim()) {
        const scriptRes = await fetch('/api/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newScriptName, content: newScriptContent }),
        });
        if (scriptRes.ok) {
          const scriptData = await scriptRes.json();
          scriptId = scriptData.id;
        }
      }

      const res = await fetch('/api/bots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          script_id: scriptId || null,
          created_by: currentUser?.id || null,
          created_by_name: currentUser?.name || null,
        }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create bot');
      }
    } finally {
      setSaving(false);
    }
  }

  const currentVoiceProvider = VOICE_PROVIDERS.find(p => p.value === form.voice_provider);
  const isTwilio = form.phone_provider === 'twilio';
  const isSignalWire = form.phone_provider === 'signalwire';

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6">
        <ArrowLeft size={14} />
        Back to dashboard
      </Link>

      <h1 className="text-xl font-bold text-white mb-6">Create New Bot</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Identity */}
        <Section title="Identity">
          <Field label="Bot Name" required>
            <Input value={form.name} onChange={v => update('name', v)} placeholder="e.g., Alex V2, Jordan, Conservative Alex" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="AI Model (Conversation)">
              <select
                value={form.model}
                onChange={e => update('model', e.target.value)}
                className="w-full bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {AI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Max Concurrent Calls">
              <Input type="number" value={form.max_concurrent.toString()} onChange={v => update('max_concurrent', parseInt(v) || 1)} />
            </Field>
          </div>
          <Field label={`${AI_MODELS.find(m => m.value === form.model)?.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key`}>
            <Input
              value={form.ai_api_key}
              onChange={v => update('ai_api_key', v)}
              placeholder={AI_MODELS.find(m => m.value === form.model)?.provider === 'openai' ? 'sk-...' : 'sk-ant-api03-...'}
              type="password"
            />
          </Field>
          <p className="text-[10px] text-gray-600">Each bot uses its own API key for the conversation model. Keys are encrypted before storage.</p>
        </Section>

        {/* Phone Provider */}
        <Section title="Phone Provider">
          <div className="flex gap-2 mb-4">
            {PHONE_PROVIDERS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => update('phone_provider', p.value)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  form.phone_provider === p.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
                    : 'border-gray-700/50 bg-[#0B1120] text-gray-400 hover:border-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {isTwilio ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Twilio Account SID">
                  <Input value={form.phone_account_sid} onChange={v => update('phone_account_sid', v)} placeholder="AC..." />
                </Field>
                <Field label="Twilio Auth Token">
                  <Input value={form.phone_api_secret} onChange={v => update('phone_api_secret', v)} placeholder="Auth Token" type="password" />
                </Field>
              </div>
              <Field label="Twilio Phone Number (From)">
                <Input value={form.phone_number} onChange={v => update('phone_number', v)} placeholder="+18005551234" />
              </Field>
            </>
          ) : isSignalWire ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SignalWire Project ID">
                  <Input value={form.phone_account_sid} onChange={v => update('phone_account_sid', v)} placeholder="a1b2c3d4-..." />
                </Field>
                <Field label="SignalWire API Token">
                  <Input value={form.phone_api_secret} onChange={v => update('phone_api_secret', v)} placeholder="PT..." type="password" />
                </Field>
              </div>
              <Field label="SignalWire Space URL">
                <Input value={form.signalwire_space_url} onChange={v => update('signalwire_space_url', v)} placeholder="yourspace.signalwire.com" />
              </Field>
              <Field label="SignalWire Phone Number (From)">
                <Input value={form.phone_number} onChange={v => update('phone_number', v)} placeholder="+18005551234" />
              </Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Telnyx API Key">
                  <Input value={form.phone_api_key} onChange={v => update('phone_api_key', v)} placeholder="KEY..." type="password" />
                </Field>
                <Field label="Telnyx Connection ID">
                  <Input value={form.phone_connection_id} onChange={v => update('phone_connection_id', v)} placeholder="Connection ID" />
                </Field>
              </div>
              <Field label="Telnyx Phone Number (From)">
                <Input value={form.phone_number} onChange={v => update('phone_number', v)} placeholder="+18005551234" />
              </Field>
            </>
          )}
        </Section>

        {/* Voice Provider */}
        <Section title="Voice Provider">
          <div className="flex gap-2 mb-4">
            {VOICE_PROVIDERS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => { update('voice_provider', p.value); setVoices([]); setVoiceError(''); }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  form.voice_provider === p.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
                    : 'border-gray-700/50 bg-[#0B1120] text-gray-400 hover:border-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Field label={`${currentVoiceProvider?.label} API Key`}>
            <Input
              value={form.voice_api_key}
              onChange={v => update('voice_api_key', v)}
              placeholder={currentVoiceProvider?.keyPlaceholder}
              type="password"
            />
          </Field>

          <div className="flex items-end gap-3 mt-3 mb-4">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Enter your API key above, then load available voices.</p>
            </div>
            <button
              type="button"
              onClick={fetchVoices}
              disabled={loadingVoices || !form.voice_api_key}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white text-xs font-semibold rounded-lg hover:bg-cyan-500 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={loadingVoices ? 'animate-spin' : ''} />
              {loadingVoices ? 'Loading...' : 'Load Voices'}
            </button>
          </div>

          {voiceError && <p className="text-xs text-red-400 mb-3">{voiceError}</p>}

          {voices.length > 0 && (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-3">
              {voices.map(v => (
                <button
                  key={v.voice_id}
                  type="button"
                  onClick={() => selectVoice(v)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                    form.voice_id === v.voice_id
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-gray-700/50 bg-[#0B1120] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-200">{v.name}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {[v.gender, v.accent, v.age].filter(Boolean).join(' / ') || v.category}
                    </div>
                  </div>
                  {v.preview_url && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); playPreview(v.preview_url!); }}
                      className="p-1 text-gray-500 hover:text-cyan-400"
                    >
                      <Play size={12} />
                    </button>
                  )}
                </button>
              ))}
            </div>
          )}

          {form.voice_id && (
            <p className="text-xs text-cyan-400 mb-3">
              Selected: <span className="font-mono">{form.voice_name}</span> ({form.voice_id.slice(0, 12)}...)
            </p>
          )}

          {/* Voice tuning */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <SliderField label="Stability" value={form.stability} min={0} max={1} step={0.05} onChange={v => update('stability', v)} />
            <SliderField label="Similarity Boost" value={form.similarity_boost} min={0} max={1} step={0.05} onChange={v => update('similarity_boost', v)} />
            <SliderField label="Style" value={form.style} min={0} max={1} step={0.05} onChange={v => update('style', v)} />
            <SliderField label="Speed" value={form.speed} min={0.5} max={2.0} step={0.05} onChange={v => update('speed', v)} />
          </div>
        </Section>

        {/* Transcription (STT) */}
        <Section title="Transcription (STT)">
          <p className="text-xs text-gray-600 mb-2">
            How the bot transcribes the prospect&apos;s speech. Telnyx engine B is free + bundled but lower accuracy. Deepgram is paid but more accurate, mandatory for SignalWire bots.
          </p>
          <div className="flex gap-2 mb-4">
            {[
              { value: 'telnyx', label: 'Telnyx engine B' },
              { value: 'deepgram', label: 'Deepgram nova-2' },
            ].map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => update('stt_provider', p.value)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  form.stt_provider === p.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
                    : 'border-gray-700/50 bg-[#0B1120] text-gray-400 hover:border-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {form.stt_provider === 'deepgram' && (
            <div className="space-y-3">
              <Field label="Deepgram API Key">
                <Input
                  value={form.deepgram_api_key}
                  onChange={v => update('deepgram_api_key', v)}
                  placeholder="<deepgram api key>"
                  type="password"
                />
              </Field>
              <Field label="Model">
                <select
                  value={form.stt_model}
                  onChange={e => update('stt_model', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B1120] border border-gray-700/50 rounded-lg text-white text-sm"
                >
                  <option value="nova-2">nova-2 (recommended)</option>
                  <option value="nova-3">nova-3</option>
                  <option value="nova">nova</option>
                  <option value="enhanced">enhanced</option>
                  <option value="base">base</option>
                </select>
              </Field>
              <p className="text-[11px] text-gray-600">
                Leave the API key blank to use the global DEEPGRAM_API_KEY env var on the server.
              </p>
            </div>
          )}

          {form.phone_provider === 'signalwire' && form.stt_provider !== 'deepgram' && (
            <p className="text-xs text-amber-400 mt-2">
              SignalWire calls require Deepgram STT — Telnyx engine B isn&apos;t available outside Telnyx telephony. Switch to Deepgram or this bot won&apos;t transcribe.
            </p>
          )}
        </Section>

        {/* Lead Pool */}
        <Section title="Lead Pool">
          <p className="text-xs text-gray-600 mb-2">Select which lead list this bot should dial from. Upload lists in the Leads tab.</p>
          {leadLists.length > 0 ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => update('lead_list_id', '')}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                  !form.lead_list_id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 bg-[#0B1120] hover:border-gray-600'
                }`}
              >
                <span className="text-gray-200 font-medium">All Leads</span>
                <span className="text-gray-600 ml-2">Dial from the entire lead pool</span>
              </button>
              {leadLists.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => update('lead_list_id', l.id)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                    form.lead_list_id === l.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 bg-[#0B1120] hover:border-gray-600'
                  }`}
                >
                  <span className="text-gray-200 font-medium">{l.name}</span>
                  {l.description && <span className="text-gray-600 ml-2">{l.description}</span>}
                  {l.lead_count !== undefined && <span className="text-gray-600 ml-2">({l.lead_count} leads)</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">No lead lists uploaded yet. Upload a CSV in the Leads tab first.</p>
          )}
        </Section>

        {/* Script */}
        <Section title="Script">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setScriptMode('existing')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                scriptMode === 'existing' ? 'bg-cyan-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
            >
              Use Existing Script
            </button>
            <button
              type="button"
              onClick={() => setScriptMode('new')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                scriptMode === 'new' ? 'bg-cyan-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
            >
              Write New Script
            </button>
          </div>

          {scriptMode === 'existing' ? (
            scripts.length > 0 ? (
              <div className="space-y-2">
                {scripts.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, script_id: s.id, prompt_id: s.name }))}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                      form.script_id === s.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-700/50 bg-[#0B1120] hover:border-gray-600'
                    }`}
                  >
                    <div className="text-gray-200 font-medium">{s.name}</div>
                    {s.description && <div className="text-gray-600 mt-0.5">{s.description}</div>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">No scripts saved yet. Write a new one below.</p>
            )
          ) : (
            <div className="space-y-3">
              <Field label="Script Name">
                <Input value={newScriptName} onChange={v => setNewScriptName(v)} placeholder="e.g., Final Expense - Aggressive Close" />
              </Field>
              <Field label="Script Content">
                <textarea
                  value={newScriptContent}
                  onChange={e => setNewScriptContent(e.target.value)}
                  placeholder="Write the full system prompt / call script here...&#10;&#10;You can use {{LEAD_NAME}}, {{LEAD_ADDRESS}}, {{LEAD_DOB}} placeholders."
                  rows={16}
                  className="w-full bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono text-xs leading-relaxed resize-y"
                />
              </Field>
            </div>
          )}
        </Section>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Bot'}
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] rounded-xl border border-gray-700/50 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 uppercase">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Input({ value, onChange, placeholder, type }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type || 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0B1120] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono"
    />
  );
}

function SliderField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between">
        <span className="text-xs text-gray-400 uppercase">{label}</span>
        <span className="text-xs text-cyan-400 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full mt-1.5 accent-cyan-500"
      />
    </label>
  );
}
