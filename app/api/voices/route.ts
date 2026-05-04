import { NextRequest, NextResponse } from 'next/server';

type Voice = {
  voice_id: string;
  name: string;
  category: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  preview_url: string | null;
};

// GET /api/voices?provider=elevenlabs|playht|cartesia|deepgram&api_key=...
export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') || 'elevenlabs';
  const apiKey = req.nextUrl.searchParams.get('api_key');

  if (!apiKey) {
    return NextResponse.json({ error: 'api_key required' }, { status: 400 });
  }

  try {
    let voices: Voice[] = [];

    if (provider === 'elevenlabs') {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
      });
      if (!res.ok) return NextResponse.json({ error: res.status === 401 ? 'Invalid API key' : `ElevenLabs error: ${res.status}` }, { status: res.status });
      const data = await res.json();
      voices = (data.voices || []).map((v: { voice_id: string; name: string; category: string; labels?: Record<string, string>; preview_url?: string }) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        accent: v.labels?.accent || null,
        gender: v.labels?.gender || null,
        age: v.labels?.age || null,
        preview_url: v.preview_url || null,
      }));

    } else if (provider === 'playht') {
      const res = await fetch('https://api.play.ht/api/v2/voices', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-USER-ID': req.nextUrl.searchParams.get('user_id') || '',
        },
      });
      if (!res.ok) return NextResponse.json({ error: res.status === 401 ? 'Invalid API key' : `PlayHT error: ${res.status}` }, { status: res.status });
      const data = await res.json();
      voices = (data || []).slice(0, 100).map((v: { id: string; name: string; gender?: string; accent?: string; age?: string; sample?: string; voice_engine?: string }) => ({
        voice_id: v.id,
        name: v.name,
        category: v.voice_engine || 'playht',
        accent: v.accent || null,
        gender: v.gender || null,
        age: v.age || null,
        preview_url: v.sample || null,
      }));

    } else if (provider === 'cartesia') {
      const res = await fetch('https://api.cartesia.ai/voices', {
        headers: {
          'X-API-Key': apiKey,
          'Cartesia-Version': '2024-06-10',
        },
      });
      if (!res.ok) return NextResponse.json({ error: res.status === 401 ? 'Invalid API key' : `Cartesia error: ${res.status}` }, { status: res.status });
      const data = await res.json();
      voices = (data || []).map((v: { id: string; name: string; description?: string; language?: string }) => ({
        voice_id: v.id,
        name: v.name,
        category: 'cartesia',
        accent: v.language || null,
        gender: null,
        age: null,
        preview_url: null,
      }));

    } else if (provider === 'deepgram') {
      // Deepgram TTS has preset voices, no API to list them
      voices = [
        { voice_id: 'aura-asteria-en', name: 'Asteria', category: 'aura', gender: 'female', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-luna-en', name: 'Luna', category: 'aura', gender: 'female', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-stella-en', name: 'Stella', category: 'aura', gender: 'female', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-athena-en', name: 'Athena', category: 'aura', gender: 'female', accent: 'British', age: null, preview_url: null },
        { voice_id: 'aura-hera-en', name: 'Hera', category: 'aura', gender: 'female', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-orion-en', name: 'Orion', category: 'aura', gender: 'male', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-arcas-en', name: 'Arcas', category: 'aura', gender: 'male', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-perseus-en', name: 'Perseus', category: 'aura', gender: 'male', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-angus-en', name: 'Angus', category: 'aura', gender: 'male', accent: 'Irish', age: null, preview_url: null },
        { voice_id: 'aura-orpheus-en', name: 'Orpheus', category: 'aura', gender: 'male', accent: 'American', age: null, preview_url: null },
        { voice_id: 'aura-helios-en', name: 'Helios', category: 'aura', gender: 'male', accent: 'British', age: null, preview_url: null },
        { voice_id: 'aura-zeus-en', name: 'Zeus', category: 'aura', gender: 'male', accent: 'American', age: null, preview_url: null },
      ];
    } else {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json({ voices });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
