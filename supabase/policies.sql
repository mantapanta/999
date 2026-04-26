-- Drachen Trimmlog — Row Level Security policies.
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
