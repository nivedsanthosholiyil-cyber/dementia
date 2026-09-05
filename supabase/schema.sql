-- MemoryCare foundation schema for Supabase.
-- Apply this file in the Supabase SQL editor or as a migration.

create extension if not exists pgcrypto;

create type public.app_role as enum ('patient', 'caregiver');
create type public.access_status as enum ('pending', 'active', 'revoked');
create type public.person_relationship as enum ('family', 'friend', 'caregiver', 'clinician', 'other');
create type public.mood_type as enum ('happy', 'calm', 'neutral', 'sad', 'worried');
create type public.reminder_category as enum ('medicine', 'meal', 'water', 'appointment', 'exercise', 'game', 'custom');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  display_name text not null default '',
  language text not null default 'en',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  profile_photo_path text,
  date_of_birth date,
  notes text,
  share_with_caregiver boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caregivers (
  id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  created_at timestamptz not null default now()
);

create table public.caregiver_patient (
  caregiver_id uuid not null references public.caregivers(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  status public.access_status not null default 'pending',
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (caregiver_id, patient_id)
);

create table public.person_memories (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  relationship public.person_relationship not null default 'other',
  nickname text,
  photo_path text,
  notes text,
  voice_recording_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  game_type text not null,
  category text not null check (category in ('Memory', 'Attention', 'Sequence', 'Reasoning', 'Daily Routine')),
  level smallint not null check (level between 1 and 5),
  score smallint not null check (score between 0 and 100),
  accuracy smallint not null check (accuracy between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  mistakes integer not null default 0 check (mistakes >= 0),
  response_time_ms integer not null default 0 check (response_time_ms >= 0),
  completed boolean not null default false,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  played_at timestamptz not null default now(),
  client_id text,
  created_at timestamptz not null default now()
);

create table public.game_metrics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  metric_name text not null,
  metric_value numeric not null,
  metric_text text,
  created_at timestamptz not null default now(),
  unique (session_id, metric_name)
);

create table public.adaptive_difficulty_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  game_type text not null,
  previous_level smallint not null check (previous_level between 1 and 5),
  new_level smallint not null check (new_level between 1 and 5),
  score smallint not null check (score between 0 and 100),
  response_time_ms integer not null default 0,
  consistency_score smallint not null default 0 check (consistency_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text not null,
  detail text not null default '',
  icon text not null default '🔔',
  time_local time not null,
  category public.reminder_category not null default 'other',
  recurring boolean not null default false,
  repeat_days smallint[] not null default '{}',
  enabled boolean not null default true,
  scheduled_date date,
  assigned_person_id uuid references public.person_memories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminder_completions (
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  primary key (reminder_id, completed_on)
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  person_id uuid references public.person_memories(id) on delete set null,
  name text not null,
  phone text not null,
  priority smallint not null default 1 check (priority > 0),
  created_at timestamptz not null default now()
);

create table public.patient_emergency_info (
  patient_id uuid primary key references public.patients(id) on delete cascade,
  blood_group text,
  allergies text,
  medical_notes text,
  doctor_name text,
  doctor_phone text,
  emergency_number text,
  emergency_notes text,
  updated_at timestamptz not null default now()
);

create index caregiver_patient_patient_idx on public.caregiver_patient(patient_id, status);
create index person_memories_patient_idx on public.person_memories(patient_id, created_at desc);
create index game_sessions_patient_played_idx on public.game_sessions(patient_id, played_at desc);
create index game_sessions_patient_type_played_idx on public.game_sessions(patient_id, game_type, played_at desc);
create index game_metrics_session_idx on public.game_metrics(session_id);
create index difficulty_history_patient_game_idx on public.adaptive_difficulty_history(patient_id, game_type, created_at desc);
create index reminders_patient_idx on public.reminders(patient_id);
create index reminders_patient_enabled_time_idx on public.reminders(patient_id, time_local) where enabled = true;
create index emergency_contacts_patient_idx on public.emergency_contacts(patient_id, priority);

-- Keep authorization helpers outside the exposed public schema. These helpers
-- are only called by RLS policies and always require an authenticated caller.
create schema if not exists private;
create or replace function private.can_access_patient(target_patient uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.patients p where p.id = target_patient and p.auth_user_id = auth.uid())
    or exists (
      select 1 from public.caregiver_patient cp
      where cp.patient_id = target_patient and cp.caregiver_id = auth.uid() and cp.status = 'active'
    )
  );
$$;
revoke all on function private.can_access_patient(uuid) from public;
grant execute on function private.can_access_patient(uuid) to authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'requested_role' = 'caregiver' then 'caregiver'::public.app_role else 'patient'::public.app_role end,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email, '')
  )
  on conflict (id) do nothing;
  if exists (select 1 from public.profiles where id = new.id and role = 'caregiver') then
    insert into public.caregivers (id) values (new.id) on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- Storage buckets. Files must use a patient-id prefix: <patient-id>/people/...
insert into storage.buckets (id, name, public)
values ('patient-media', 'patient-media', false)
on conflict (id) do nothing;

insert into public.games (slug, name, description) values
  ('picture-pairs', 'Picture Pairs', 'Match familiar pictures'),
  ('follow-the-sequence', 'Follow the Sequence', 'Repeat the displayed sequence'),
  ('daily-routine-ordering', 'Daily Routine Ordering', 'Put daily activities in order'),
  ('who-is-this-person', 'Who Is This Person?', 'Recognize a familiar person')
on conflict (slug) do update set name = excluded.name, description = excluded.description;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.caregivers enable row level security;
alter table public.caregiver_patient enable row level security;
alter table public.person_memories enable row level security;
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_metrics enable row level security;
alter table public.adaptive_difficulty_history enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_completions enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.patient_emergency_info enable row level security;

create policy "read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "update own profile fields" on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

create policy "patient owner or linked caregiver can read patients" on public.patients for select to authenticated
  using (private.can_access_patient(id));
create policy "patient owner manages patient" on public.patients for insert to authenticated
  with check ((select auth.uid()) = auth_user_id);
create policy "patient owner updates patient" on public.patients for update to authenticated
  using ((select auth.uid()) = auth_user_id) with check ((select auth.uid()) = auth_user_id);
create policy "patient owner deletes patient" on public.patients for delete to authenticated
  using ((select auth.uid()) = auth_user_id);

create policy "own caregiver profile" on public.caregivers for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "participants manage caregiver links" on public.caregiver_patient for all to authenticated
  using (
    (select auth.uid()) = caregiver_id
    or exists (select 1 from public.patients p where p.id = patient_id and p.auth_user_id = auth.uid())
  ) with check (
    (select auth.uid()) = caregiver_id
    or exists (select 1 from public.patients p where p.id = patient_id and p.auth_user_id = auth.uid())
  );

create policy "access people" on public.person_memories for select to authenticated using (private.can_access_patient(patient_id));
create policy "linked users manage people" on public.person_memories for insert to authenticated with check (private.can_access_patient(patient_id));
create policy "linked users update people" on public.person_memories for update to authenticated using (private.can_access_patient(patient_id)) with check (private.can_access_patient(patient_id));
create policy "linked users delete people" on public.person_memories for delete to authenticated using (private.can_access_patient(patient_id));

create policy "authenticated read games" on public.games for select to authenticated using (active = true);
create policy "access game sessions" on public.game_sessions for select to authenticated using (private.can_access_patient(patient_id));
create policy "patient creates game sessions" on public.game_sessions for insert to authenticated with check (exists (select 1 from public.patients p where p.id = patient_id and p.auth_user_id = auth.uid()));
create policy "access game metrics" on public.game_metrics for select to authenticated using (exists (select 1 from public.game_sessions s where s.id = session_id and private.can_access_patient(s.patient_id)));
create policy "patient creates game metrics" on public.game_metrics for insert to authenticated with check (exists (select 1 from public.game_sessions s join public.patients p on p.id = s.patient_id where s.id = session_id and p.auth_user_id = auth.uid()));
create policy "access difficulty history" on public.adaptive_difficulty_history for select to authenticated using (private.can_access_patient(patient_id));
create policy "patient writes difficulty history" on public.adaptive_difficulty_history for insert to authenticated with check (exists (select 1 from public.patients p where p.id = patient_id and p.auth_user_id = auth.uid()));

create policy "access reminders" on public.reminders for select to authenticated using (private.can_access_patient(patient_id));
create policy "linked users manage reminders" on public.reminders for all to authenticated using (private.can_access_patient(patient_id)) with check (private.can_access_patient(patient_id));
create policy "access reminder completions" on public.reminder_completions for select to authenticated using (exists (select 1 from public.reminders r where r.id = reminder_id and private.can_access_patient(r.patient_id)));
create policy "linked users manage reminder completions" on public.reminder_completions for all to authenticated using (exists (select 1 from public.reminders r where r.id = reminder_id and private.can_access_patient(r.patient_id))) with check (exists (select 1 from public.reminders r where r.id = reminder_id and private.can_access_patient(r.patient_id)));

create policy "access emergency contacts" on public.emergency_contacts for select to authenticated using (private.can_access_patient(patient_id));
create policy "linked users manage emergency contacts" on public.emergency_contacts for all to authenticated using (private.can_access_patient(patient_id)) with check (private.can_access_patient(patient_id));
create policy "access emergency info" on public.patient_emergency_info for select to authenticated using (private.can_access_patient(patient_id));
create policy "linked users manage emergency info" on public.patient_emergency_info for all to authenticated using (private.can_access_patient(patient_id)) with check (private.can_access_patient(patient_id));

create policy "patient media read" on storage.objects for select to authenticated
  using (bucket_id = 'patient-media' and private.can_access_patient(split_part(name, '/', 1)::uuid));
create policy "patient media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-media' and exists (select 1 from public.patients p where p.id = split_part(name, '/', 1)::uuid and p.auth_user_id = auth.uid()));
create policy "patient media update" on storage.objects for update to authenticated
  using (bucket_id = 'patient-media' and exists (select 1 from public.patients p where p.id = split_part(name, '/', 1)::uuid and p.auth_user_id = auth.uid()))
  with check (bucket_id = 'patient-media' and exists (select 1 from public.patients p where p.id = split_part(name, '/', 1)::uuid and p.auth_user_id = auth.uid()));
create policy "patient media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'patient-media' and exists (select 1 from public.patients p where p.id = split_part(name, '/', 1)::uuid and p.auth_user_id = auth.uid()));
