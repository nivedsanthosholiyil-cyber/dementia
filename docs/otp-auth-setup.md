# OTP authentication deployment

Apply the two SQL migrations in `supabase/migrations/` (or the updated
`supabase/schema.sql` for a new project), then deploy the `auth-otp` Edge
Function with JWT verification disabled because sign-in and signup occur before
there is a user session:

```sh
supabase functions deploy auth-otp --no-verify-jwt
```

Set `AUTH_RATE_LIMIT_SALT` as an Edge Function secret to a unique, random value
of at least 32 bytes. Do not add it, `SUPABASE_SERVICE_ROLE_KEY`, or any other
secret to a Vite environment file. Hosted Supabase supplies `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to functions.

In Supabase Dashboard, enable the Email provider and **Confirm email**. In the
Email Templates section, update both **Confirm signup** and **Magic Link** to
render `{{ .Token }}` (the six-digit OTP), not `{{ .ConfirmationURL }}`. Keep
the password-recovery template unchanged. Google provider settings and Guest
Mode need no changes.

The Edge Function permits three OTP sends per email and per IP in fifteen
minutes, and five code-verification attempts in fifteen minutes; the next
request locks that key for fifteen minutes. Supabase Auth retains its own
mailer, token-expiry, and abuse protections. The database only receives salted
SHA-256 identifiers, never a raw email address or IP.
