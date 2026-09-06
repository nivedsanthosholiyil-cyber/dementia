import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface SupabaseDiagnostics {
  urlPresent: boolean;
  publicKeyPresent: boolean;
  clientInitialized: boolean;
  authenticatedSession: boolean;
}

export async function inspectSupabase(): Promise<SupabaseDiagnostics> {
  const result: SupabaseDiagnostics = {
    urlPresent: Boolean(import.meta.env.VITE_SUPABASE_URL),
    publicKeyPresent: Boolean(
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      || import.meta.env.VITE_SUPABASE_ANON_KEY,
    ),
    clientInitialized: isSupabaseConfigured && Boolean(supabase),
    authenticatedSession: false,
  };

  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      result.authenticatedSession = Boolean(data.session);
    } catch {
      result.authenticatedSession = false;
    }
  }

  if (import.meta.env.DEV) {
    console.info('[MemoryCare] Supabase diagnostics', result);
  }
  return result;
}
