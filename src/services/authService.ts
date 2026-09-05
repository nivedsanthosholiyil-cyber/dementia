import type { AppRole } from '@/types';
import { supabase } from '@/lib/supabase';

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

export function onAuthStateChange(callback: (authenticated: boolean) => void) {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(Boolean(session)));
  return () => data.subscription.unsubscribe();
}
