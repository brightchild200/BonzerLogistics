import { supabase } from '@/lib/supabase';
import type { SalesPersonRow, UserRow } from '@/lib/schema';

export type SalespersonSession = {
  userId: number | null;
  authUserId: string | null;
  roles: string[];
  salespersonId: number | null;
  authEmail: string | null;
  appUser: UserRow | null;
  salesperson: SalesPersonRow | null;
};

export async function resolveSalespersonSession(authEmail: string | null | undefined): Promise<SalespersonSession> {
  const email = authEmail?.trim().toLowerCase() || null;

  if (!email) {
    return {
      userId: null,
      authUserId: null,
      roles: [],
      salespersonId: null,
      authEmail: null,
      appUser: null,
      salesperson: null,
    };
  }

  // Resolve the app user first
  const appUserRes = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
  const appUser = appUserRes.data ?? null;

  let roles: string[] = [];
  if (appUser) {
    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select('roles(role_name)')
      .eq('user_id', appUser.id);

    if (userRolesData) {
      roles = userRolesData
        .map((ur: any) => ur.roles?.role_name)
        .filter((r): r is string => typeof r === 'string');
    }

    // Fallback: if no roles are assigned in user_roles yet, use the legacy users.role column
    if (roles.length === 0 && appUser.role) {
      roles = [appUser.role];
    }
  }

  // For admin or pricing/CS/ops/accounts etc., resolving salesperson mapping
  // Primary strategy: sales_persons.email -> auth user email.
  const salesPersonByEmail = await supabase
    .from('sales_persons')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  let salesperson = salesPersonByEmail.data ?? null;

  if (!salesperson && appUser) {
    // Fallback: match through user_id
    const salesPersonByUser = await supabase
      .from('sales_persons')
      .select('*')
      .eq('user_id', appUser.id)
      .maybeSingle();
    salesperson = salesPersonByUser.data ?? null;
  }

  return {
    userId: appUser?.id ?? null,
    authUserId: appUser?.auth_user_id ?? null,
    roles,
    salespersonId: salesperson?.id ?? null,
    authEmail: email,
    appUser,
    salesperson,
  };
}


