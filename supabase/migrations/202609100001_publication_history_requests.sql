-- Additive migration. Apply before exposing publication history / update requests.
begin;
create table public.demo_world_editions (
  publication_id text not null references public.demo_world_publications(id),
  edition integer not null check (edition > 0),
  document jsonb not null,
  saved_at timestamptz not null,
  primary key (publication_id, edition)
);
alter table public.demo_world_editions enable row level security;
revoke all on public.demo_world_editions from public, anon, authenticated, service_role;
grant select on public.demo_world_editions to service_role;

-- Preserve the current legacy edition; do not pretend older overwritten versions exist.
lock table public.demo_world_publications in share row exclusive mode;
insert into public.demo_world_editions
select id, 1, document - 'sourceId', updated_at from public.demo_world_publications;

create function public.demo_capture_world_edition() returns trigger
language plpgsql security definer set search_path = '' as $$
declare next_edition integer;
begin
  if TG_OP = 'UPDATE' then
    if NEW.owner_id is distinct from OLD.owner_id or NEW.id is distinct from OLD.id then
      raise exception 'publication identity is immutable';
    end if;
    if (NEW.document - 'sourceId') = (OLD.document - 'sourceId') then return NEW; end if;
  end if;
  select coalesce(max(edition), 0) + 1 into next_edition
    from public.demo_world_editions where publication_id = NEW.id;
  insert into public.demo_world_editions values (NEW.id, next_edition, NEW.document - 'sourceId', NEW.updated_at);
  return NEW;
end;
$$;
revoke all on function public.demo_capture_world_edition() from public, anon, authenticated, service_role;
create trigger demo_world_edition_capture after insert or update on public.demo_world_publications
for each row execute function public.demo_capture_world_edition();

create table public.demo_world_update_requests (
  publication_id text not null,
  edition integer not null,
  requester_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (publication_id, edition, requester_id),
  foreign key (publication_id, edition) references public.demo_world_editions(publication_id, edition)
);
alter table public.demo_world_update_requests enable row level security;
revoke all on public.demo_world_update_requests from public, anon, authenticated, service_role;

create function public.demo_request_world_update(p_id text, p_requester uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare target public.demo_world_publications; current_edition integer;
begin
  select * into target from public.demo_world_publications where id = p_id for update;
  if not found or not target.published then return jsonb_build_object('status', 'unavailable'); end if;
  if target.owner_id = p_requester then return jsonb_build_object('status', 'own_world'); end if;
  select max(edition) into current_edition from public.demo_world_editions where publication_id = p_id;
  if current_edition is null then raise exception 'edition missing'; end if;
  insert into public.demo_world_update_requests(publication_id, edition, requester_id)
    values(p_id, current_edition, p_requester) on conflict do nothing;
  return jsonb_build_object('status', 'received', 'edition', current_edition);
end;
$$;
revoke all on function public.demo_request_world_update(text, uuid) from public, anon, authenticated;
grant execute on function public.demo_request_world_update(text, uuid) to service_role;

-- Only aggregate counts leave the database; never disclose readers' identities.
create function public.demo_world_update_inbox(p_owner uuid) returns table(publication_id text, edition integer, requests bigint)
language sql security definer set search_path = '' as $$
  select e.publication_id, e.edition, count(r.requester_id)
  from public.demo_world_editions e
  join public.demo_world_publications p on p.id = e.publication_id and p.owner_id = p_owner
  left join public.demo_world_update_requests r on r.publication_id = e.publication_id and r.edition = e.edition
  where e.edition = (select max(latest.edition) from public.demo_world_editions latest where latest.publication_id = e.publication_id)
  group by e.publication_id, e.edition;
$$;
revoke all on function public.demo_world_update_inbox(uuid) from public, anon, authenticated;
grant execute on function public.demo_world_update_inbox(uuid) to service_role;
commit;
