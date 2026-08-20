-- Cloud-Sync store for the training app.
-- One row per (user, storage key); `value` holds the same JSON string that
-- localStorage holds. Last-write-wins via `updated_at` (single user, several devices).
--
-- Re-runnable: Postgres kennt kein `create policy if not exists`, deshalb steht
-- vor jeder Policy ein `drop policy if exists`. Ohne das bricht ein zweiter
-- Durchlauf ab — und genau den braucht man, wenn nur `0002` nachgezogen werden
-- soll. Dasselbe SQL steht als Kopierblock in `supabase/SETUP.md`; Änderungen
-- hier gehören auch dorthin.

create table if not exists public.app_state (
  user_id    uuid        not null references auth.users on delete cascade,
  key        text        not null,
  value      text        not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_state enable row level security;

-- A user may only ever see or touch their own rows.
drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own"
  on public.app_state for select
  using (auth.uid() = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own"
  on public.app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app_state_delete_own" on public.app_state;
create policy "app_state_delete_own"
  on public.app_state for delete
  using (auth.uid() = user_id);
