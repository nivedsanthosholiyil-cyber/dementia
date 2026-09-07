import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const languageCodes = ['en', 'hi', 'as', 'bn', 'lus', 'mni'];

function clientIp(request: Request): string {
  return (request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim();
}

async function digest(value: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Request could not be completed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const rateLimitSalt = Deno.env.get('AUTH_RATE_LIMIT_SALT');
  if (!url || !anonKey || !serviceRoleKey || !rateLimitSalt) return json({ error: 'Request could not be completed.' }, 500);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'Request could not be completed.' }, 400); }
  const action = typeof body.action === 'string' ? body.action : '';
  const flow = typeof body.flow === 'string' ? body.flow : action;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!emailPattern.test(email) || !['signup', 'login'].includes(flow) || !['signup', 'login', 'resend', 'verify'].includes(action)) {
    return json({ error: 'Please check the information and try again.' }, 400);
  }

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const limitAction = action === 'verify' ? 'otp_verify' : flow === 'login' ? 'otp_login' : 'otp_signup';
  const maxAttempts = action === 'verify' ? 5 : 3;
  const windowSeconds = action === 'verify' ? 15 * 60 : 15 * 60;
  const lockSeconds = action === 'verify' ? 15 * 60 : 15 * 60;
  try {
    const [emailKey, ipKey] = await Promise.all([
      digest(`email:${email}`, rateLimitSalt),
      digest(`ip:${clientIp(request)}`, rateLimitSalt),
    ]);
    const attempts = await Promise.all([emailKey, ipKey].map(async (subjectKey) => {
      const { data, error } = await admin.rpc('consume_auth_rate_limit', {
        subject_key: subjectKey, action_name: limitAction, max_attempts: maxAttempts,
        window_seconds: windowSeconds, lock_seconds: lockSeconds,
      });
      if (error) throw error;
      return data === true;
    }));
    if (attempts.some((allowed) => !allowed)) return json({ error: 'Too many requests. Please wait before trying again.' }, 429);
  } catch {
    return json({ error: 'Request could not be completed right now. Please try again.' }, 503);
  }

  if (action === 'signup') {
    const password = typeof body.password === 'string' ? body.password : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 100) : '';
    const language = typeof body.language === 'string' && languageCodes.includes(body.language) ? body.language : 'en';
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !displayName) {
      return json({ error: 'Please check the information and try again.' }, 400);
    }
    const { data, error } = await auth.auth.signUp({ email, password, options: { data: { display_name: displayName, language } } });
    if (error || !data.user || data.user.identities?.length === 0) return json({ error: error?.message.includes('already') || data.user?.identities?.length === 0 ? 'An account with this email already exists. Try signing in instead.' : 'Unable to create this account right now.' }, 400);
    return json({ ok: true });
  }

  if (action === 'resend' && flow === 'signup') {
    const { error } = await auth.auth.resend({ type: 'signup', email });
    if (error) return json({ error: 'Unable to resend a verification code right now.' }, 503);
    return json({ ok: true });
  }

  if (action === 'login' || (action === 'resend' && flow === 'login')) {
    // This deliberately gives the same success response for nonexistent accounts.
    // Supabase's shouldCreateUser:false prevents an OTP request from creating one.
    await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    return json({ ok: true });
  }

  const token = typeof body.token === 'string' ? body.token.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(token)) return json({ error: 'That code is invalid or has expired.' }, 400);
  const { data, error } = await auth.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.session) return json({ error: 'That code is invalid or has expired.' }, 400);
  return json({ session: data.session });
});
