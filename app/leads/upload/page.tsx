'use client';

import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const FIELD_OPTIONS = [
  { value: '', label: 'Skip column' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'street_address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'Zip' },
  { value: 'dob', label: 'DOB' },
  { value: 'age', label: 'Age' },
  { value: 'gender', label: 'Gender' },
  { value: 'existing_carrier', label: 'Existing Carrier (Active Carrier)' },
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: 'current_coverage', label: 'Current Coverage' },
  { value: 'current_premium', label: 'Current Premium' },
];

function autoMapColumn(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (h.includes('phone') || h.includes('cell') || h.includes('mobile')) return 'phone';
  if (h === 'name' || h.includes('fullname')) return 'full_name';
  if (h.includes('first')) return 'first_name';
  if (h.includes('last')) return 'last_name';
  if (h.includes('email')) return 'email';
  if (h.includes('address') || h.includes('street')) return 'street_address';
  if (h.includes('city')) return 'city';
  if (h.includes('state')) return 'state';
  if (h.includes('zip') || h.includes('postal')) return 'zip';
  if (h.includes('dob') || h.includes('birth') || h.includes('bday')) return 'dob';
  if (h.includes('age') && !h.includes('coverage') && !h.includes('carrier')) return 'age';
  if (h.includes('gender') || h.includes('sex')) return 'gender';
  if (h.includes('carrier')) return 'existing_carrier';
  if (h.includes('beneficiary')) return 'beneficiary';
  if (h.includes('coverage') || h.includes('faceamount')) return 'current_coverage';
  if (h.includes('premium')) return 'current_premium';
  return '';
}

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [listName, setListName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const parseFile = useCallback((file: File) => {
    setListName(file.name.replace(/\.csv$/i, ''));
    Papa.parse(file, {
      complete: (res) => {
        const rows = res.data as string[][];
        if (rows.length < 2) return;
        const hdrs = rows[0];
        setHeaders(hdrs);
        setPreview(rows.slice(1, 6));
        setAllRows(rows.slice(1).filter(r => r.some(c => c.trim())));
        const autoMap: Record<number, string> = {};
        hdrs.forEach((h, i) => { autoMap[i] = autoMapColumn(h); });
        setMapping(autoMap);
      },
    });
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) parseFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  async function handleUpload() {
    if (!allRows.length) return;
    const phoneIdx = Object.entries(mapping).find(([, v]) => v === 'phone');
    if (!phoneIdx) { alert('Phone column is required'); return; }

    setUploading(true);
    try {
      const leads = allRows.map(row => {
        const lead: Record<string, string> = {};
        Object.entries(mapping).forEach(([idx, field]) => {
          if (field && row[parseInt(idx)]) lead[field] = row[parseInt(idx)].trim();
        });
        return lead;
      }).filter(l => l.phone);

      const res = await fetch('/api/leads/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, listName }),
      });
      const data = await res.json();
      setResult({ success: data.inserted || 0, errors: data.errors || 0 });
    } catch {
      setResult({ success: 0, errors: allRows.length });
    } finally {
      setUploading(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
        <div className="max-w-lg mx-auto mt-20 text-center">
          <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Upload Complete</h2>
          <p className="text-sm text-gray-400 mb-1">{result.success} leads imported</p>
          {result.errors > 0 && <p className="text-sm text-red-400">{result.errors} errors (duplicate phone or missing data)</p>}
          <Link href="/leads" className="inline-block mt-6 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg">View Leads</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <div className="max-w-3xl mx-auto">
        <Link href="/leads" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">&larr; Back to Leads</Link>
        <h1 className="text-xl font-bold text-white mb-6">Upload CSV</h1>

        {!headers.length ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-emerald-400 bg-emerald-500/5'
                : 'border-gray-700 bg-[#111827] hover:border-gray-500'
            }`}
          >
            <Upload size={32} className={`mx-auto mb-3 ${dragging ? 'text-emerald-400' : 'text-gray-600'}`} />
            <p className="text-sm text-gray-400 mb-1">Drag and drop a CSV file here</p>
            <p className="text-xs text-gray-600">or click to browse</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Column Mapping</h3>
              <p className="text-xs text-gray-600 mb-4">{allRows.length} rows detected. Map each CSV column to a lead field.</p>
              <div className="grid grid-cols-2 gap-3">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-32 truncate" title={h}>{h}</span>
                    <span className="text-xs text-gray-700">&rarr;</span>
                    <select
                      value={mapping[i] || ''}
                      onChange={e => setMapping({ ...mapping, [i]: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs bg-[#0B1120] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500"
                    >
                      {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Preview (first 5 rows)</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-gray-500 uppercase">
                      {headers.map((h, i) => <th key={i} className="px-2 py-1 text-left">{mapping[i] || <span className="text-gray-700 italic">skip</span>}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-gray-800/50">
                        {row.map((cell, j) => <td key={j} className="px-2 py-1 text-gray-400 truncate max-w-[120px]">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#111827] border border-gray-700/50 rounded-xl p-5">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">List Name</label>
              <input value={listName} onChange={e => setListName(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-[#0B1120] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 mb-4" />
              <button onClick={handleUpload} disabled={uploading} className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                {uploading ? 'Uploading...' : `Upload ${allRows.length} Leads`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
