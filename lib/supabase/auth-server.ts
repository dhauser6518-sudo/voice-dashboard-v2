import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getAuthUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server components can't set cookies
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
