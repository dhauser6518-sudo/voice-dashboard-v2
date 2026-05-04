import { createServerClient } from '@/lib/supabase/server';
import { decrypt, type EncryptedValue } from '@/lib/encryption';

export async function getCartesiaKey(): Promise<string | null> {
  const supabase = createServerClient();

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (userKeys?.cartesia_api_key) {
    const k = userKeys.cartesia_api_key;
    const decrypted = (typeof k === 'object' && (k as EncryptedValue).ct)
      ? decrypt(k as EncryptedValue)
      : (typeof k === 'string' ? k : null);
    if (decrypted) return decrypted;
  }

  return process.env.CARTESIA_API_KEY || null;
}

export type CartesiaCall = {
  id: string;
  agent_id: string;
  agent_name?: string;
  status: 'created' | 'started' | 'completed' | 'failed';
  start_time: string;
  end_time?: string;
  end_reason?: string;
  summary?: string;
  transcript?: CartesiaTranscriptTurn[];
  telephony_params?: {
    to?: string;
    from?: string;
    direction?: 'inbound' | 'outbound';
  };
  metadata?: Record<string, string>;
};

export type CartesiaTranscriptTurn = {
  role: 'user' | 'assistant' | 'system';
  text: string;
  start_timestamp?: number;
  end_timestamp?: number;
  tool_calls?: { id: string; name: string; arguments: Record<string, unknown>; result: string }[];
};

export async function fetchAgentIds(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.cartesia.ai/agents', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': '2025-04-16',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.summaries || []).map((a: { id: string }) => a.id);
}

async function fetchCallsForAgent(
  apiKey: string,
  agentId: string,
  opts: { limit?: number; expand?: string } = {},
): Promise<{ calls: CartesiaCall[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  params.set('agent_id', agentId);
  params.set('limit', String(opts.limit || 100));
  if (opts.expand) params.set('expand', opts.expand);

  const res = await fetch(`https://api.cartesia.ai/agents/calls?${params}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': '2025-04-16',
    },
  });

  if (!res.ok) return { calls: [], hasMore: false };

  const data = await res.json();
  return {
    calls: data.data || [],
    hasMore: data.has_more || false,
  };
}

export async function fetchCartesiaCalls(
  apiKey: string,
  opts: { limit?: number; expand?: string } = {},
): Promise<{ calls: CartesiaCall[]; hasMore: boolean }> {
  const agentIds = await fetchAgentIds(apiKey);
  const results = await Promise.all(
    agentIds.map(id => fetchCallsForAgent(apiKey, id, opts))
  );
  const allCalls = results.flatMap(r => r.calls);
  allCalls.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  return {
    calls: allCalls.slice(0, opts.limit || 100),
    hasMore: results.some(r => r.hasMore),
  };
}

async function fetchAllCallsForAgent(
  apiKey: string,
  agentId: string,
  opts: { since?: string; limit?: number } = {},
): Promise<CartesiaCall[]> {
  const all: CartesiaCall[] = [];
  const pageSize = 100;
  let cursor: string | undefined;
  const maxPages = Math.ceil((opts.limit || 500) / pageSize);

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams();
    params.set('agent_id', agentId);
    params.set('limit', String(pageSize));
    if (cursor) params.set('starting_after', cursor);

    const res = await fetch(`https://api.cartesia.ai/agents/calls?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Cartesia-Version': '2025-04-16',
      },
    });

    if (!res.ok) break;

    const data = await res.json();
    const calls: CartesiaCall[] = data.data || [];
    if (calls.length === 0) break;

    for (const c of calls) {
      if (opts.since && c.start_time < opts.since) return all;
      all.push(c);
    }

    if (!data.has_more) break;
    cursor = calls[calls.length - 1].id;
  }

  return all;
}

export async function fetchAllCartesiaCalls(
  apiKey: string,
  opts: { since?: string; limit?: number } = {},
): Promise<CartesiaCall[]> {
  const agentIds = await fetchAgentIds(apiKey);
  const results = await Promise.all(
    agentIds.map(id => fetchAllCallsForAgent(apiKey, id, opts))
  );
  const all = results.flat();
  all.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  return opts.limit ? all.slice(0, opts.limit) : all;
}
