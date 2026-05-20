-- Seen Through Sound MVP schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  organization_name text default 'Even Though I’m Blind, Inc.',
  intro_audio_url text,
  outro_audio_url text,
  playlist_public boolean default true,
  max_recording_seconds int default 90,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  speaker_name text,
  speaker_email text,
  anonymous boolean default false,
  title text default 'Encouragement Message',
  original_audio_url text not null,
  processed_audio_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','published','hidden')),
  moderation_note text,
  share_slug text unique not null,
  created_at timestamptz default now(),
  approved_at timestamptz,
  published_at timestamptz
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'reviewer' check (role in ('owner','reviewer')),
  created_at timestamptz default now()
);

insert into public.settings (id, organization_name)
values (1, 'Even Though I’m Blind, Inc.')
on conflict (id) do nothing;

-- Storage bucket. You can also create this in the Supabase dashboard.
insert into storage.buckets (id, name, public)
values ('encouragement-audio', 'encouragement-audio', true)
on conflict (id) do nothing;

alter table public.settings enable row level security;
alter table public.submissions enable row level security;
alter table public.admin_users enable row level security;

-- Public can read settings so the playlist can use intro/outro URLs.
create policy "Anyone can read settings"
on public.settings for select
using (true);

-- Public can submit encouragement messages.
create policy "Anyone can create pending submissions"
on public.submissions for insert
with check (status = 'pending');

-- Public can read only published submissions.
create policy "Anyone can read published submissions"
on public.submissions for select
using (status = 'published');

-- Admin helper: checks if current auth email is listed in admin_users.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Admins can read all submissions.
create policy "Admins can read all submissions"
on public.submissions for select
using (public.is_admin());

-- Admins can update submissions.
create policy "Admins can update submissions"
on public.submissions for update
using (public.is_admin())
with check (public.is_admin());

-- Admins can update settings.
create policy "Admins can update settings"
on public.settings for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can insert settings"
on public.settings for insert
with check (public.is_admin());

-- Admin users table should only be readable by admins.
create policy "Admins can read admin users"
on public.admin_users for select
using (public.is_admin());

-- Storage policies for public audio bucket.
create policy "Anyone can upload encouragement audio"
on storage.objects for insert
with check (bucket_id = 'encouragement-audio');

create policy "Anyone can read encouragement audio"
on storage.objects for select
using (bucket_id = 'encouragement-audio');

-- After running this file, add your admin email:
-- insert into public.admin_users (email, role) values ('your-email@example.com', 'owner');
