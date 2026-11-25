-- DIAO DEV RESSOURCES — schéma Supabase
-- À exécuter dans Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text not null,
  description text not null default '',
  category text not null,
  tags text[] not null default '{}',
  cover_url text,
  external_url text,
  file_url text,
  published boolean not null default false,
  views bigint not null default 0,
  clicks bigint not null default 0,
  downloads bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_events (
  id bigint generated always as identity primary key,
  resource_id uuid not null references public.resources(id) on delete cascade,
  event_type text not null check (event_type in ('view','click','download')),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists resources_published_created_idx on public.resources(published, created_at desc);
create index if not exists resources_category_idx on public.resources(category);
create index if not exists resources_tags_idx on public.resources using gin(tags);
create index if not exists resource_events_resource_idx on public.resource_events(resource_id, created_at desc);

alter table public.resources enable row level security;
alter table public.resource_events enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- Lecture publique des seules ressources publiées.
drop policy if exists "Public can read published resources" on public.resources;
create policy "Public can read published resources" on public.resources
for select to anon, authenticated using (published = true or (select auth.uid()) is not null);

-- Écriture des ressources réservée aux utilisateurs authentifiés.
drop policy if exists "Authenticated admins manage resources" on public.resources;
create policy "Authenticated admins manage resources" on public.resources
for all to authenticated using (true) with check (true);

-- Les événements ne sont pas lisibles publiquement. L'insertion passe par la fonction ci-dessous.
drop policy if exists "No public event reads" on public.resource_events;
create policy "No public event reads" on public.resource_events
for select to authenticated using (true);

-- Inscription publique avec consentement. Aucun accès public en lecture.
drop policy if exists "Visitors can subscribe with consent" on public.newsletter_subscribers;
create policy "Visitors can subscribe with consent" on public.newsletter_subscribers
for insert to anon, authenticated with check (consent = true);
drop policy if exists "Authenticated admins read subscribers" on public.newsletter_subscribers;
create policy "Authenticated admins read subscribers" on public.newsletter_subscribers
for select to authenticated using (true);
drop policy if exists "Authenticated admins delete subscribers" on public.newsletter_subscribers;
create policy "Authenticated admins delete subscribers" on public.newsletter_subscribers
for delete to authenticated using (true);

create or replace function public.track_resource_event(resource_id uuid, event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if event_type not in ('view','click','download') then
    raise exception 'Invalid event type';
  end if;
  if not exists (select 1 from public.resources where id = resource_id and published = true) then
    return;
  end if;
  insert into public.resource_events(resource_id, event_type) values (resource_id, event_type);
  if event_type = 'view' then update public.resources set views = views + 1 where id = resource_id;
  elsif event_type = 'click' then update public.resources set clicks = clicks + 1 where id = resource_id;
  elsif event_type = 'download' then update public.resources set downloads = downloads + 1 where id = resource_id;
  end if;
end;
$$;
grant execute on function public.track_resource_event(uuid, text) to anon, authenticated;

-- Storage : créer manuellement un bucket public nommé "resource-assets".
-- Les fichiers privés/sensibles ne doivent pas être placés dans ce bucket public.
