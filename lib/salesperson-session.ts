import { supabase } from '@/lib/supabase';
import type { SalesPersonRow, UserRow } from '@/lib/schema';

export type SalespersonSession = {
  authEmail: string | null;
  appUser: UserRow | null;
  salesperson: SalesPersonRow | null;
};

export async function resolveSalespersonSession(authEmail: string | null | undefined): Promise<SalespersonSession> {
  const email = authEmail?.trim().toLowerCase() || null;

  if (!email) {
    return { authEmail: null, appUser: null, salesperson: null };
  }

  // Resolve the app user first so we can read `users.role` (admin vs sales_person)
  const appUserRes = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
  const appUser = appUserRes.data ?? null;

  // If admin, we don't require a sales_persons mapping
  if (appUser?.role === 'admin') {
    return { authEmail: email, appUser, salesperson: null };
  }

  // For non-admin users, resolve salesperson mapping.
  // Primary strategy: sales_persons.email -> auth user email.
  const salesPersonByEmail = await supabase
    .from('sales_persons')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (salesPersonByEmail.data) {
    return { authEmail: email, appUser, salesperson: salesPersonByEmail.data };
  }

  // Fallback: match through user_id.
  // If users.email lookup failed (appUser null), we cannot use this fallback.
  const salesPersonByUser = appUser
    ? await supabase.from('sales_persons').select('*').eq('user_id', appUser.id).maybeSingle()
    : { data: null };

  return {
    authEmail: email,
    appUser,
    salesperson: salesPersonByUser.data ?? null,
  };
}


