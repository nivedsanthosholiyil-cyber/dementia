# MemoryCare

An elderly-friendly, offline-first cognitive gaming & memory-assistance PWA.
Built for Smart India Hackathon 2026 — Team SIGMA SYNAPSE (PS SIH26003).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

## Supabase and Google sign-in

Copy `.env.example` to `.env.local`, add the project URL and publishable/anon
key, then restart Vite. Never use a service-role key in this app:

```bash
cp .env.example .env.local
npm run dev
```

The browser client lives in `src/lib/supabase.ts` and uses Supabase's normal
browser session persistence. It accepts `VITE_SUPABASE_ANON_KEY` (or the newer
`VITE_SUPABASE_PUBLISHABLE_KEY`).

### Google OAuth configuration

1. In Google Cloud Console, create an OAuth Web application and add the callback URL shown in Supabase **Authentication > Providers > Google**. Do not put the Google client secret in this repository or Vercel.
2. In Supabase **Authentication > Providers > Google**, enable Google and paste the Google client ID and client secret there.
3. In Supabase **Authentication > URL Configuration**, add the Vercel production URL already assigned to this project and local development URLs (for example `http://localhost:5173`) as redirect URLs.
4. In Vercel **Project > Settings > Environment Variables**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) for Production, Preview, and Development, then redeploy. These are public browser keys; never set `service_role` or another secret as a `VITE_` variable.

The Vite build also normalizes public values from the Supabase/Vercel
integration when it provides `SUPABASE_URL` plus `SUPABASE_ANON_KEY` (or the
equivalent `NEXT_PUBLIC_*` names). These are build-time aliases only; the
browser client still reads `import.meta.env.VITE_*`, and no service-role value
is accepted or mapped.

Apply `supabase/schema.sql` before using the app. For an existing project,
apply `supabase/auth_google_migration.sql` afterwards; it preserves existing
role assignments while enabling first-sign-in role selection for Google users.
Google accounts create/use
`auth.users` identities and are authorized solely through the existing
`profiles`, `patients`, and `caregiver_patient` RLS model. Link caregivers to
patients through `caregiver_patient`; one caregiver may have multiple active
links.

## Production build

```bash
npm run build    # type-checks, then builds to dist/
npm run preview  # serve the production build locally
```

## What's inside

- **Local profiles and access:** patient/caregiver onboarding, local demo PIN fallback,
  profile selection, and role-protected caregiver routes.
- **Patient experience:** Home, 3 playable games (Picture Pairs, Pattern Recall,
  Daily Routine), editable reminders, Progress, Settings, and separate local profiles.
- **Caregiver / Family dashboard:** Overview, Progress trends, gentle Alerts,
  Patient profile, Settings.
- **Adaptive engine:** score >=80 levels up, 50-79 holds, <50 eases down (levels 1-5).
- **Accessibility first:** large-text / jumbo-button / high-contrast / reduced-motion
  modes, voice guidance (browser speech), 6 languages (English & Hindi full;
  Assamese, Bengali, Mizo, Meitei partial with English fallback).
- **Privacy:** IndexedDB + localStorage schema migration, patient-scoped records and a
  local data deletion path. Caregiver screens require the caregiver role; activity is
  only populated for the selected, consented profile.
- **Demo sync:** this is explicitly a local-device demo, not live synchronization.

## Demo limitations

- PIN and optional browser biometric capability are convenience features for this
  single-browser demo; they are not a replacement for server-side authentication.
- Browser notifications require permission and cannot guarantee alarms while a browser
  or device is fully closed.
- Video calling uses a configured `tel:` contact. A real backend/native app is needed
  for cross-device sync, account recovery, reliable background alarms, secure sharing,
  and actual video calling.
- The app does not diagnose medical conditions or guarantee emergency services.

## Checks

Run `npm run build` after installing dependencies. The build performs TypeScript
checking and production bundling. No demo data is seeded automatically; presentation
data should be added deliberately through the app.

Framing throughout is "activity trends," never medical diagnosis.
