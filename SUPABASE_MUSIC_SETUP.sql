-- Run once in Supabase > SQL Editor > New query > Run
-- Adds one private MP3 track per album. Existing albums and photos are unchanged.
create table if not exists public.album_music (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null unique references public.albums(id) on delete cascade,
  storage_path text not null,
  title text,
  created_at timestamptz not null default now()
);
alter table public.album_music enable row level security;
drop policy if exists "Authenticated users can view album music" on public.album_music;
create policy "Authenticated users can view album music" on public.album_music
for select to authenticated using (true);
drop policy if exists "Admins can insert album music" on public.album_music;
create policy "Admins can insert album music" on public.album_music
for insert to authenticated with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'));
drop policy if exists "Admins can update album music" on public.album_music;
create policy "Admins can update album music" on public.album_music
for update to authenticated using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'))
with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'));
drop policy if exists "Admins can delete album music" on public.album_music;
create policy "Admins can delete album music" on public.album_music
for delete to authenticated using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'));
