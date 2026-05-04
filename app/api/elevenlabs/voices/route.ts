import { NextRequest, NextResponse } from 'next/server';

// GET /api/elevenlabs/voices?api_key=... — fetch available voices from ElevenLabs
export async function GET(req: NextRequest) {
  const apiKey = req.nextUrl.searchParams.get('api_key');
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key required' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: res.status === 401 ? 'Invalid API key' : `ElevenLabs error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const voices = (data.voices || []).map((v: { voice_id: string; name: string; category: string; labels?: Record<string, string>; preview_url?: string }) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      accent: v.labels?.accent || null,
      gender: v.labels?.gender || null,
      age: v.labels?.age || null,
      preview_url: v.preview_url || null,
    }));

    return NextResponse.json({ voices });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
