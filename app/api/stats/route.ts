import { getCartesiaKey, fetchAllCartesiaCalls } from '@/lib/cartesia';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const apiKey = await getCartesiaKey();
  if (!apiKey) {
    return NextResponse.json({
      activeBots: 0, totalBots: 0, activeCalls: 0, totalCalls: 0,
      pickups: 0, voicemails: 0, totalSales: 0, totalPremium: 0,
    });
  }

  const range = request.nextUrl.searchParams.get('range') || 'today';
  const direction = request.nextUrl.searchParams.get('direction') || '';

  let since: string | undefined;
  if (range === 'today') {
    const d = new Date(); d.setHours(d.getHours() - 24);
    since = d.toISOString();
  } else if (range === '7d') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    since = d.toISOString();
  } else if (range === '30d') {
    const d = new Date(); d.setDate(d.getDate() - 30);
    since = d.toISOString();
  }

  // Fetch agents
  const agentsRes = await fetch('https://api.cartesia.ai/agents', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': '2025-04-16',
    },
  });
  const agentsBody = agentsRes.ok ? await agentsRes.json() : { summaries: [] };
  const agents = agentsBody.summaries || [];
  const totalBots = agents.length;
  const activeBots = agents.filter((a: { is_live?: boolean }) => a.is_live).length;

  // Fetch calls from all agents, filter by direction if specified
  let allCalls = await fetchAllCartesiaCalls(apiKey, { since, limit: 1000 });
  if (direction === 'inbound' || direction === 'outbound') {
    allCalls = allCalls.filter(c => c.telephony_params?.direction === direction);
  }

  const totalCalls = allCalls.length;
  const activeCalls = allCalls.filter(c => c.status === 'started').length;
  const completed = allCalls.filter(c => c.status === 'completed');
  const pickups = completed.filter(c => {
    const duration = c.end_time && c.start_time
      ? (new Date(c.end_time).getTime() - new Date(c.start_time).getTime()) / 1000
      : 0;
    return duration > 10;
  }).length;
  const voicemails = completed.filter(c => {
    const duration = c.end_time && c.start_time
      ? (new Date(c.end_time).getTime() - new Date(c.start_time).getTime()) / 1000
      : 0;
    return duration <= 10 && c.end_reason !== 'error';
  }).length;

  // Check for sales in transcript tool calls
  let totalSales = 0;
  let totalPremium = 0;
  for (const call of completed) {
    if (!call.transcript) continue;
    for (const turn of call.transcript) {
      if (!turn.tool_calls) continue;
      for (const tc of turn.tool_calls) {
        if (tc.name === 'record_sale') {
          totalSales++;
          const premium = Number(tc.arguments?.monthly_premium);
          if (!isNaN(premium) && premium > 0) totalPremium += premium * 12;
        }
      }
    }
  }

  return NextResponse.json({
    activeBots, totalBots, activeCalls, totalCalls,
    pickups, voicemails, totalSales, totalPremium: Math.round(totalPremium),
  });
}
