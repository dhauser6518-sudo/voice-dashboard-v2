'use client';

import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, FileText, Sparkles, Send, X } from 'lucide-react';

type Script = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  product_type: string;
  created_at: string;
  updated_at: string;
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selected, setSelected] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isNew, setIsNew] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadScripts(); }, []);

  async function loadScripts() {
    setLoading(true);
    try {
      const res = await fetch('/api/scripts');
      const data = await res.json();
      const list = data.scripts || [];
      setScripts(list);
      if (list.length > 0 && !selected) selectScript(list[0]);
    } finally { setLoading(false); }
  }

  function selectScript(s: Script) {
    setSelected(s); setDraftName(s.name); setDraftDescription(s.description || ''); setDraftContent(s.content || ''); setIsNew(false);
  }

  function startNew() {
    setSelected(null); setDraftName(''); setDraftDescription(''); setDraftContent(''); setIsNew(true);
  }

  async function handleSave() {
    if (!draftName.trim() || !draftContent.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name: draftName, description: draftDescription, content: draftContent };
      if (selected && !isNew) body.id = selected.id;
      const res = await fetch('/api/scripts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { const saved = await res.json(); await loadScripts(); setSelected(saved); setIsNew(false); }
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selected || isNew) return;
    if (!confirm(`Delete "${selected.name}"?`)) return;
    await fetch(`/api/scripts/${selected.id}`, { method: 'DELETE' });
    setSelected(null); setDraftName(''); setDraftDescription(''); setDraftContent(''); await loadScripts();
  }

  async function handleAiAssist() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch('/api/ai/script-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: aiPrompt, currentScript: draftContent || null }) });
      const data = await res.json();
      setAiResult(res.ok ? data.text : `Error: ${data.error}`);
    } catch { setAiResult('Network error'); } finally { setAiLoading(false); }
  }

  function applyAiResult() {
    if (aiResult && !aiResult.startsWith('Error:')) { setDraftContent(aiResult); setAiOpen(false); setAiResult(''); setAiPrompt(''); }
  }
  function insertAiResult() {
    if (aiResult && !aiResult.startsWith('Error:')) { setDraftContent(prev => prev + '\n\n' + aiResult); setAiOpen(false); setAiResult(''); setAiPrompt(''); }
  }

  if (loading) return <div className="min-h-screen -m-8 p-8 bg-[#0B1120] text-center py-20 text-gray-600">Loading scripts...</div>;

  return (
    <div className="flex -m-8 min-h-screen bg-[#0B1120]">
      {/* Script List Sidebar */}
      <div className="w-60 bg-[#111827] border-r border-gray-700/50 p-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xs font-bold text-gray-400 uppercase">Scripts</h1>
          <button onClick={startNew} className="p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-gray-800 rounded transition-colors" title="New script">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-1">
          {scripts.map(s => (
            <button
              key={s.id}
              onClick={() => selectScript(s)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selected?.id === s.id && !isNew ? 'bg-gray-800 text-white font-medium' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-gray-600 shrink-0" />
                <span className="truncate">{s.name}</span>
              </div>
            </button>
          ))}
          {scripts.length === 0 && <p className="text-xs text-gray-700 text-center py-4">No scripts yet</p>}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-8">
        {!selected && !isNew ? (
          <div className="text-center py-20"><p className="text-gray-600 text-sm">Select a script to edit or create a new one</p></div>
        ) : (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{isNew ? 'New Script' : 'Edit Script'}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAiOpen(!aiOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    aiOpen ? 'bg-purple-600 text-white' : 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20'
                  }`}
                >
                  <Sparkles size={12} />
                  AI Assist
                </button>
                {selected && !isNew && (
                  <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !draftName.trim() || !draftContent.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  <Save size={12} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* AI Assist Panel */}
            {aiOpen && (
              <div className="mb-6 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="text-sm font-semibold text-purple-300">AI Script Assistant</span>
                    <span className="text-[10px] text-purple-600">Claude Sonnet 4.6</span>
                  </div>
                  <button onClick={() => setAiOpen(false)} className="text-gray-600 hover:text-gray-400"><X size={14} /></button>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAiAssist()}
                    placeholder={draftContent ? '"Add stronger objection handling" or "Rewrite the opener"' : '"Write a conservative final expense script"'}
                    className="flex-1 px-3 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                  <button onClick={handleAiAssist} disabled={aiLoading || !aiPrompt.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-500 disabled:opacity-50 transition-colors">
                    <Send size={12} /> {aiLoading ? 'Thinking...' : 'Generate'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {['Write a new final expense script', 'Add more objection handling', 'Make the tone more aggressive', 'Make it more conversational', 'Add a Medicare section', 'Rewrite the opener'].map(s => (
                    <button key={s} onClick={() => setAiPrompt(s)} className="px-2 py-1 text-[10px] bg-gray-800/50 border border-gray-700/50 text-purple-400 rounded-md hover:bg-gray-800 transition-colors">{s}</button>
                  ))}
                </div>

                {aiLoading && (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center gap-2 text-sm text-purple-400">
                      <div className="w-4 h-4 border-2 border-purple-800 border-t-purple-400 rounded-full animate-spin" /> Writing script...
                    </div>
                  </div>
                )}

                {aiResult && !aiLoading && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-purple-400 font-semibold uppercase">AI Output</span>
                      <div className="flex gap-2">
                        <button onClick={insertAiResult} className="px-3 py-1 text-[10px] bg-gray-800 border border-gray-700 text-gray-300 rounded-md hover:bg-gray-700">Append to script</button>
                        <button onClick={applyAiResult} className="px-3 py-1 text-[10px] bg-purple-600 text-white rounded-md hover:bg-purple-500">Replace entire script</button>
                      </div>
                    </div>
                    <pre className="bg-[#0B1120] border border-gray-700/50 rounded-lg p-3 text-xs font-mono text-gray-300 max-h-64 overflow-y-auto whitespace-pre-wrap">{aiResult}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-gray-500 uppercase">Name</span>
                  <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Script name" className="w-full mt-1 px-3 py-2 bg-[#111827] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 uppercase">Description</span>
                  <input value={draftDescription} onChange={e => setDraftDescription(e.target.value)} placeholder="Short description (optional)" className="w-full mt-1 px-3 py-2 bg-[#111827] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
                </label>
              </div>

              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase">Script Content</span>
                  <span className="text-[10px] text-gray-600">{draftContent.length.toLocaleString()} chars</span>
                </div>
                <textarea
                  value={draftContent}
                  onChange={e => setDraftContent(e.target.value)}
                  placeholder={'Write the full system prompt / call script here...\n\nUse {{LEAD_NAME}}, {{LEAD_ADDRESS}}, {{LEAD_DOB}} placeholders.'}
                  rows={28}
                  className="w-full mt-1 px-4 py-3 bg-[#111827] border border-gray-700 rounded-lg text-sm font-mono text-gray-300 leading-relaxed resize-y focus:outline-none focus:border-cyan-500"
                />
              </label>

              <p className="text-[10px] text-gray-700">
                Placeholders: {'{{LEAD_NAME}}'} {'{{LEAD_ADDRESS}}'} {'{{LEAD_DOB}}'} {'{{LEAD_CARRIER}}'} {'{{LEAD_COVERAGE}}'} {'{{LEAD_PREMIUM}}'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
