import { getCartesiaKey, fetchCartesiaCalls } from '@/lib/cartesia';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = await getCartesiaKey();
  if (!apiKey) {
    return NextResponse.json({ active: [], recent: [] });
  }

  const { calls } = await fetchCartesiaCalls(apiKey, { limit: 30 });

  const active = calls
    .filter(c => c.status === 'started')
    .map(c => ({
      id: c.id,
      phone: c.telephony_params?.to || c.telephony_params?.from || '?',
      lead: c.metadata?.first_name
        ? `${c.metadata.first_name} ${c.metadata.last_name || ''}`.trim()
        : null,
      bot: c.agent_name || null,
      started_at: c.start_time,
      duration: c.start_time
        ? Math.floor((Date.now() - new Date(c.start_time).getTime()) / 1000)
        : 0,
    }));

  const recent = calls
    .filter(c => c.status === 'completed' || c.status === 'failed')
    .slice(0, 20)
    .map(c => {
      const duration = c.end_time && c.start_time
        ? Math.floor((new Date(c.end_time).getTime() - new Date(c.start_time).getTime()) / 1000)
        : null;

      let outcome: string | null = null;
      if (c.status === 'failed') outcome = 'failed';
      else if (duration !== null && duration <= 5) outcome = 'no_answer';
      else if (c.end_reason === 'agent_hangup' && duration !== null && duration <= 15) outcome = 'voicemail';

      // Check transcript for sale
      if (c.transcript) {
        for (const turn of c.transcript) {
          if (turn.tool_calls?.some(tc => tc.name === 'record_sale')) {
            outcome = 'sale';
            break;
          }
        }
      }

      return {
        id: c.id,
        phone: c.telephony_params?.to || c.telephony_params?.from || '?',
        lead: c.metadata?.first_name
          ? `${c.metadata.first_name} ${c.metadata.last_name || ''}`.trim()
          : null,
        bot: c.agent_name || null,
        outcome,
        disposition: c.end_reason || null,
        stage: null,
        duration,
        ended_at: c.end_time || null,
      };
    });

  return NextResponse.json({ active, recent });
}
