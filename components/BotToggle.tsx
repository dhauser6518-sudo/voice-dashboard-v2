'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function BotToggle({ botId, initialActive }: { botId: string; initialActive: boolean }) {
  const [isActive, setIsActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const newStatus = !isActive;
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: botId, is_active: newStatus }),
      });
      if (res.ok) {
        setIsActive(newStatus);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        isActive ? 'bg-emerald-500' : 'bg-gray-600'
      } ${loading ? 'opacity-50' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          isActive ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
