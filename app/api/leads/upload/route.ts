import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const VALID_FIELDS = new Set([
  'full_name', 'first_name', 'last_name', 'phone', 'email',
  'street_address', 'city', 'state', 'zip', 'dob',
  'age', 'gender', 'beneficiary',
  'existing_carrier', 'current_coverage', 'current_premium',
]);

export async function POST(req: Request) {
  const { leads, listName } = await req.json();
  if (!leads?.length) return NextResponse.json({ error: 'No leads' }, { status: 400 });

  const supabase = createServerClient();

  // Create list entry for tracking
  let listId: string | null = null;
  if (listName) {
    const { data: list } = await supabase.from('lead_lists').insert({ name: listName }).select('id').single();
    listId = list?.id || null;
  }

  let inserted = 0;
  let errors = 0;

  // Batch insert in chunks of 100
  for (let i = 0; i < leads.length; i += 100) {
    const chunk = leads.slice(i, i + 100).map((lead: Record<string, string>) => {
      // Only include fields that exist on voice_leads
      const clean: Record<string, string | null> = {};
      for (const [key, val] of Object.entries(lead)) {
        if (VALID_FIELDS.has(key) && val) clean[key] = val.trim();
      }
      // Build full_name if not provided
      if (!clean.full_name && (clean.first_name || clean.last_name)) {
        clean.full_name = `${clean.first_name || ''} ${clean.last_name || ''}`.trim();
      }
      // Clean phone
      if (clean.phone) clean.phone = clean.phone.replace(/\D/g, '');
      clean.source = listName || 'csv_upload';
      if (listId) clean.lead_list_id = listId;
      return clean;
    }).filter((l: Record<string, string | null>) => l.phone);

    const { data, error } = await supabase
      .from('voice_leads')
      .upsert(chunk, { onConflict: 'phone', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error('Upload chunk error:', error.message);
      errors += chunk.length;
    } else {
      inserted += data?.length || 0;
      errors += chunk.length - (data?.length || 0);
    }
  }

  return NextResponse.json({ inserted, errors, listId });
}
