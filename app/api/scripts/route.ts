import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scripts — list all scripts
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('voice_scripts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scripts: data });
}

// POST /api/scripts — create or update a script
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerClient();

  if (!body.name?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
  }

  if (body.id) {
    // Update existing
    const { data, error } = await supabase
      .from('voice_scripts')
      .update({
        name: body.name.trim(),
        description: body.description || null,
        content: body.content,
        product_type: body.product_type || 'final_expense',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    // Create new
    const { data, error } = await supabase
      .from('voice_scripts')
      .insert({
        name: body.name.trim(),
        description: body.description || null,
        content: body.content,
        product_type: body.product_type || 'final_expense',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}
