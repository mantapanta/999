-- Drachen Trimmlog — Komplett-Setup (Schema + Policies)
--
-- Einmal in den Supabase SQL Editor pasten und Run drücken.
-- Idempotent: kann gefahrlos wiederholt werden.
--
-- Inhalt entspricht supabase/schema.sql + supabase/policies.sql
-- in dieser Reihenfolge.

-- ====================================================================
-- TEIL 1: SCHEMA (6 Tabellen, Enums, Indexe, updated_at-Trigger)
-- ====================================================================

--
-- Run this in Supabase SQL Editor BEFORE policies.sql.
-- Re-runnable: uses CREATE TABLE IF NOT EXISTS / DROP TRIGGER IF EXISTS,
-- and ENUMs are guarded with EXCEPTION WHEN duplicate_object.
--
-- Adjust column names or types BEFORE running if you have stronger
-- preferences — easier than schema-migrating later. The structure
-- assumes Dragon class but the same shape works for most one-design
-- keelboats.

create extension if not exists "pgcrypto";

------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------
do $$ begin
  create type wind_band as enum ('LW1', 'LW2', 'MW', 'SW');
exception when duplicate_object then null; end $$;

do $$ begin
  create type learning_status as enum ('offen', 'bestaetigt', 'verworfen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type debrief_status as enum ('pending', 'transcribed', 'analyzed', 'failed');
exception when duplicate_object then null; end $$;

------------------------------------------------------------------------
-- 1. base_setups
--    The 4 ampel reference setups (one row per user × wind band).
--    These are the "go-to" rigging baselines you fall back to.
------------------------------------------------------------------------
create table if not exists public.base_setups (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  band                  wind_band not null,
  name                  text not null,                 -- "Leichtwind 0-7 kn"
  wind_min_kn           numeric(4,1),
  wind_max_kn           numeric(4,1),

  -- Mast & rigg
  mast_rake_cm          numeric(5,1),                  -- Mast-Rake an Deck
  pre_bend_cm           numeric(4,1),                  -- Vorbiegung
  forestay_length_mm    integer,                       -- Vorstag-Länge
  upper_shroud_tension  integer,                       -- Wanten Loos-Eichung
  lower_shroud_tension  integer,
  backstay_tension_pct  integer,                       -- Achterstag (0..100)
  spreader_angle_deg    numeric(4,1),
  spreader_length_mm    integer,
  jumper_tension        integer,                       -- Jumpstag

  -- Frei für alles, was wir noch nicht formalisiert haben
  extras                jsonb not null default '{}'::jsonb,
  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, band)
);

------------------------------------------------------------------------
-- 2. setups_library
--    Benannte Varianten (z.B. "Garda 12 kn", "Kiel kabbelig MW").
--    Optional von einem base_setup abgeleitet.
------------------------------------------------------------------------
create table if not exists public.setups_library (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  base_id               uuid references public.base_setups(id) on delete set null,
  name                  text not null,
  wind_min_kn           numeric(4,1),
  wind_max_kn           numeric(4,1),

  mast_rake_cm          numeric(5,1),
  pre_bend_cm           numeric(4,1),
  upper_shroud_tension  integer,
  lower_shroud_tension  integer,
  backstay_tension_pct  integer,
  jumper_tension        integer,

  extras                jsonb not null default '{}'::jsonb,
  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists setups_library_user_idx
  on public.setups_library (user_id);

------------------------------------------------------------------------
-- 3. races
------------------------------------------------------------------------
create table if not exists public.races (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,

  race_date             date not null,
  regatta_name          text,
  location              text,

  -- Bedingungen
  wind_min_kn           numeric(4,1),
  wind_max_kn           numeric(4,1),
  wind_direction_deg    integer,
  wave_state            text,                          -- "glatt" | "kabbelig" | "Welle"
  current_kn            numeric(3,1),

  -- Welches Setup wurde gefahren
  base_setup_id         uuid references public.base_setups(id) on delete set null,
  setup_id              uuid references public.setups_library(id) on delete set null,

  -- Ergebnis
  start_position        smallint,
  finish_position       smallint,
  fleet_size            smallint,
  points                numeric(5,1),

  -- Was wurde während des Rennens am Trimm geändert (Stichworte/JSON)
  trim_changes          jsonb not null default '{}'::jsonb,
  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists races_user_date_idx
  on public.races (user_id, race_date desc);

------------------------------------------------------------------------
-- 4. audio_debriefs
------------------------------------------------------------------------
create table if not exists public.audio_debriefs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,

  recorded_at           timestamptz not null default now(),
  audio_path            text not null,                 -- Pfad im Storage-Bucket "debriefs"
  duration_seconds      integer,
  mime_type             text,

  -- Phase 3 — null bis Verarbeitung
  transcript            text,
  summary               text,
  analysis              jsonb,
  status                debrief_status not null default 'pending',
  error_message         text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists debriefs_user_recorded_idx
  on public.audio_debriefs (user_id, recorded_at desc);

------------------------------------------------------------------------
-- 5. race_debrief_links — N:M
--    Ownership wird in policies.sql aus races abgeleitet, kein
--    user_id-Spalte hier.
------------------------------------------------------------------------
create table if not exists public.race_debrief_links (
  race_id      uuid not null references public.races(id) on delete cascade,
  debrief_id   uuid not null references public.audio_debriefs(id) on delete cascade,
  primary key (race_id, debrief_id)
);
create index if not exists race_debrief_links_debrief_idx
  on public.race_debrief_links (debrief_id);

------------------------------------------------------------------------
-- 6. learnings
--    Muster und Hypothesen, die aus Rennen + Debriefs extrahiert werden.
------------------------------------------------------------------------
create table if not exists public.learnings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,

  title                 text not null,
  hypothesis            text,
  status                learning_status not null default 'offen',
  confidence            numeric(3,2),                  -- 0.00..1.00
  source_race_ids       uuid[] not null default '{}',
  source_debrief_ids    uuid[] not null default '{}',
  tags                  text[] not null default '{}',

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists learnings_user_status_idx
  on public.learnings (user_id, status);

------------------------------------------------------------------------
-- updated_at-Trigger für alle 5 owned-Tabellen
------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array['base_setups', 'setups_library', 'races',
                        'audio_debriefs', 'learnings'])
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ====================================================================
-- TEIL 2: ROW-LEVEL-SECURITY-POLICIES
-- ====================================================================

--
-- Run this in the Supabase SQL Editor *after* you've applied the schema
-- that defines the 6 application tables. The schema is paste-as-text from
-- a separate document and is intentionally not in this repo.
--
-- ASSUMPTIONS
--   - Every owned table has a column:
--       user_id uuid not null references auth.users(id) on delete cascade
--   - The join table `race_debrief_links` has columns `race_id uuid` and
--     `debrief_id uuid` referencing `races.id` and `audio_debriefs.id`.
--
-- If your column names differ, update them below before running.
-- Re-running this script is safe: every policy uses `drop policy if exists`
-- before recreating.

------------------------------------------------------------------------
-- 1. base_setups
------------------------------------------------------------------------
alter table public.base_setups enable row level security;
drop policy if exists "owner reads base_setups"  on public.base_setups;
drop policy if exists "owner writes base_setups" on public.base_setups;

create policy "owner reads base_setups"
  on public.base_setups for select
  using (auth.uid() = user_id);

create policy "owner writes base_setups"
  on public.base_setups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------------
-- 2. setups_library
------------------------------------------------------------------------
alter table public.setups_library enable row level security;
drop policy if exists "owner reads setups_library"  on public.setups_library;
drop policy if exists "owner writes setups_library" on public.setups_library;

create policy "owner reads setups_library"
  on public.setups_library for select
  using (auth.uid() = user_id);

create policy "owner writes setups_library"
  on public.setups_library for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------------
-- 3. races
------------------------------------------------------------------------
alter table public.races enable row level security;
drop policy if exists "owner reads races"  on public.races;
drop policy if exists "owner writes races" on public.races;

create policy "owner reads races"
  on public.races for select
  using (auth.uid() = user_id);

create policy "owner writes races"
  on public.races for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------------
-- 4. audio_debriefs
------------------------------------------------------------------------
alter table public.audio_debriefs enable row level security;
drop policy if exists "owner reads audio_debriefs"  on public.audio_debriefs;
drop policy if exists "owner writes audio_debriefs" on public.audio_debriefs;

create policy "owner reads audio_debriefs"
  on public.audio_debriefs for select
  using (auth.uid() = user_id);

create policy "owner writes audio_debriefs"
  on public.audio_debriefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------------
-- 5. race_debrief_links — join table.
--    Ownership derived from the linked race row. The link is only valid
--    if the user owns BOTH the race and the debrief.
------------------------------------------------------------------------
alter table public.race_debrief_links enable row level security;
drop policy if exists "owner reads race_debrief_links"  on public.race_debrief_links;
drop policy if exists "owner writes race_debrief_links" on public.race_debrief_links;

create policy "owner reads race_debrief_links"
  on public.race_debrief_links for select
  using (
    exists (select 1 from public.races r
             where r.id = race_id and r.user_id = auth.uid())
  );

create policy "owner writes race_debrief_links"
  on public.race_debrief_links for all
  using (
    exists (select 1 from public.races r
             where r.id = race_id and r.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.races r
             where r.id = race_id and r.user_id = auth.uid())
    and exists (select 1 from public.audio_debriefs d
                 where d.id = debrief_id and d.user_id = auth.uid())
  );

------------------------------------------------------------------------
-- 6. learnings
------------------------------------------------------------------------
alter table public.learnings enable row level security;
drop policy if exists "owner reads learnings"  on public.learnings;
drop policy if exists "owner writes learnings" on public.learnings;

create policy "owner reads learnings"
  on public.learnings for select
  using (auth.uid() = user_id);

create policy "owner writes learnings"
  on public.learnings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------------
-- Storage: lock the `debriefs` bucket to its uploader.
-- Run AFTER creating the bucket (Storage → New bucket → Private).
------------------------------------------------------------------------
drop policy if exists "owner reads debrief audio"   on storage.objects;
drop policy if exists "owner uploads debrief audio" on storage.objects;
drop policy if exists "owner deletes debrief audio" on storage.objects;

create policy "owner reads debrief audio"
  on storage.objects for select
  using (bucket_id = 'debriefs' and auth.uid() = owner);

create policy "owner uploads debrief audio"
  on storage.objects for insert
  with check (bucket_id = 'debriefs' and auth.uid() = owner);

create policy "owner deletes debrief audio"
  on storage.objects for delete
  using (bucket_id = 'debriefs' and auth.uid() = owner);
