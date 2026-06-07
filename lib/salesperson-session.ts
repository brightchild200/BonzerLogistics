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

  const salesPersonByEmail = await supabase
    .from('sales_persons')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (salesPersonByEmail.data) {
    const appUser = salesPersonByEmail.data.user_id
      ? await supabase.from('users').select('*').eq('id', salesPersonByEmail.data.user_id).maybeSingle()
      : { data: null };

    return {
      authEmail: email,
      appUser: appUser.data ?? null,
      salesperson: salesPersonByEmail.data,
    };
  }

  const appUser = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
  if (!appUser.data) {
    return { authEmail: email, appUser: null, salesperson: null };
  }

  const salesPersonByUser = await supabase.from('sales_persons').select('*').eq('user_id', appUser.data.id).maybeSingle();

  return {
    authEmail: email,
    appUser: appUser.data,
    salesperson: salesPersonByUser.data ?? null,
  };
}
