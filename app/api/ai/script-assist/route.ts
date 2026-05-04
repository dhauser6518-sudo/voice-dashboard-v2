import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert insurance sales script writer. You help create and refine AI voice agent call scripts for outbound final expense and life insurance sales.

Key principles:
- Scripts should sound natural and conversational, not robotic
- Two sentences max per turn (three when explaining benefits)
- Include clear stage progression (opener → hook → benefits → verification → application → close)
- Include comprehensive objection handling organized by stage
- Use {{LEAD_NAME}}, {{LEAD_ADDRESS}}, {{LEAD_DOB}}, {{LEAD_CARRIER}}, {{LEAD_COVERAGE}}, {{LEAD_PREMIUM}} placeholders for lead data
- Include hard rules (never claim to be licensed agent, never deny being AI when asked, kill phrases handling)
- No markdown formatting in the actual script text — the AI speaks these lines aloud
- Include identity section, lead context section, voice/style guidelines, call flow stages, objection handling, and hard rules

When asked to write a new script, output the FULL script ready to be used as a system prompt.
When asked to improve/edit, output only the revised sections with clear markers.`;

export async function POST(req: NextRequest) {
  const { prompt, currentScript } = await req.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const userMessage = currentScript
    ? `Here is the current script:\n\n${currentScript}\n\n---\n\nUser request: ${prompt}`
    : prompt;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: res.status });
    }

    const result = await res.json();
    const text = result?.content?.[0]?.text || '';

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
