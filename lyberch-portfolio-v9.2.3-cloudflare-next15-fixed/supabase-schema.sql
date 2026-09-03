-- Lyberch portfolio database
-- Run this once in Supabase SQL Editor.

create table if not exists public.projects (
  id text primary key,
  title text not null,
  description text not null,
  tags jsonb not null default '[]'::jsonb,
  image text not null default '',
  url text,
  github text,
  role text,
  challenge text,
  solution text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists projects_published_created_idx
  on public.projects (published, created_at desc);

-- The Next.js server uses the Supabase service-role key, so browser clients
-- never need direct database access. RLS is enabled as an extra safeguard.
alter table public.projects enable row level security;
