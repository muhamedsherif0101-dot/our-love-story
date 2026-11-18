-- Run once in Supabase > SQL Editor > New query > Run
-- Enables the admin to edit the website's ready-made messages.
create table if not exists public.site_content (
  content_key text primary key,
  content_value text not null default '' ,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists "Authenticated users can view site content" on public.site_content;
create policy "Authenticated users can view site content" on public.site_content
for select to authenticated using (true);
drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content" on public.site_content
for insert to authenticated with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'));
drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content" on public.site_content
for update to authenticated using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'))
with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'));
