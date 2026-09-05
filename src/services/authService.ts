import type { AppRole } from '@/types';
import { supabase } from '@/lib/supabase';

export interface AuthContext {
  userId: string;
  role: AppRole;
  displayName: string;
  needsRoleSelection: boolean;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function signUp(email: string, password: string, displayName: string, role: AppRole) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { requested_role: role, display_name: displayName.trim() } } });
  if (error) throw error;
  if (!data.user) throw new Error('No account was returned.');
  return { user: data.user, session: data.session };
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role, display_name').eq('id', data.user.id).single();
  if (profileError) throw profileError;
  return { ...data, role: profile.role as AppRole, displayName: profile.display_name as string };
}

export async function signOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export async function currentSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function currentAuthContext(): Promise<AuthContext | null> {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) return null;
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role, display_name, role_selected_at').eq('id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;
  return { userId: user.id, role: profile.role as AppRole, displayName: profile.display_name || user.email || 'User', needsRoleSelection: !profile.role_selected_at };
}

export async function selectMyAppRole(role: AppRole): Promise<string | null> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('select_my_app_role', { selected_role: role });
  if (error) throw error;
  return data as string | null;
}

export function onAuthStateChange(callback: (authenticated: boolean) => void) {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(Boolean(session)));
  return () => data.subscription.unsubscribe();
}
