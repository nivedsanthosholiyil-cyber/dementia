import type { AppRole } from '@/types';
import { supabase } from '@/lib/supabase';

export interface AuthContext {
  userId: string;
  role: AppRole;
  displayName: string;
  needsRoleSelection: boolean;
}

export const PASSWORD_REQUIREMENTS = 'Use at least 8 characters, including one letter and one number.';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isStrongEnoughPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

/** Turns Supabase's low-level messages into clear guidance for caregivers. */
export function authErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  if (normalized.includes('email not confirmed')) {
    return 'Your email is not confirmed yet. Check your inbox for the confirmation link, then try again.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'The email or password is incorrect. Check both fields and try again.';
  }
  if (normalized.includes('already registered') || normalized.includes('user already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('failed to')) {
    return 'We could not reach Supabase. Check your internet connection and try again.';
  }
  return message || fallback;
}

export function authRedirectUrl(path = '/'): string {
  // window.location.origin is the deployed Vercel domain in production and
  // localhost during development, so reset links never contain a hard-coded host.
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUrl('/') },
  });
  if (error) throw error;
}

export async function signUp(email: string, password: string, displayName = '', role?: AppRole) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const metadata = { display_name: displayName.trim(), ...(role ? { requested_role: role } : {}) };
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
  if (error) throw error;
  if (!data.user) throw new Error('No account was returned.');
  return { user: data.user, session: data.session };
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function resetPasswordForEmail(email: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl('/reset-password'),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
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
