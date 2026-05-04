'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteBotButton({ botId, botName }: { botId: string; botName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/bots/${botId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      alert('Failed to delete bot');
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={12} />
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-400">Delete &quot;{botName}&quot;?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
      >
        {deleting ? 'Deleting...' : 'Confirm'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
