import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EditBotForm from './EditBotForm';

export const dynamic = 'force-dynamic';

export default async function EditBotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: bot } = await supabase.from('voice_agents').select('*').eq('id', id).single();
  if (!bot) redirect('/');

  const { data: scripts } = await supabase.from('voice_scripts').select('id, name, description').order('name');
  const { data: leadLists } = await supabase.from('lead_lists').select('id, name, description').order('name');

  return (
    <div className="min-h-screen -m-8 p-8 bg-[#0B1120]">
      <Link href={`/bots/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6">
        <ArrowLeft size={14} />
        Back to bot
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Edit: {bot.name}</h1>
      <EditBotForm bot={bot} scripts={scripts || []} leadLists={leadLists || []} />
    </div>
  );
}
