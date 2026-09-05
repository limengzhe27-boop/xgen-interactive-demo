begin;
create table public.demo_world_publications (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  owner_id uuid not null references auth.users(id),
  document jsonb not null check (octet_length(document::text) <= 250000),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.demo_world_publications enable row level security;
revoke all on public.demo_world_publications from public, anon, authenticated;
grant select, insert, update on public.demo_world_publications to service_role;
create index demo_world_publications_owner on public.demo_world_publications(owner_id);
create function public.demo_publish_world(p_id text, p_owner uuid, p_document jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or p_id !~ '^[a-f0-9]{64}$' or p_owner is null or p_document is null then raise exception 'invalid publication'; end if;
  perform pg_advisory_xact_lock(60906002);
  if exists (select 1 from public.demo_world_publications where id = p_id and owner_id <> p_owner) then raise exception 'not owner'; end if;
  if not exists (select 1 from public.demo_world_publications where id = p_id) then
    if (select count(*) from public.demo_world_publications) >= 200
      or (select count(*) from public.demo_world_publications where owner_id = p_owner) >= 10 then raise exception 'publication limit'; end if;
  end if;
  insert into public.demo_world_publications(id, owner_id, document) values(p_id, p_owner, p_document)
    on conflict(id) do update set document = excluded.document, published = true, updated_at = now();
end;
$$;
revoke all on function public.demo_publish_world(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.demo_publish_world(text, uuid, jsonb) to service_role;
commit;
