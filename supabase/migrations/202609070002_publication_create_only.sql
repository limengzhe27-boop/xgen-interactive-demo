-- Apply before enabling publication: existing content updates use conditional PATCH.
begin;
create or replace function public.demo_publish_world(p_id text, p_owner uuid, p_document jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or p_id !~ '^[a-f0-9]{64}$' or p_owner is null or p_document is null then raise exception 'invalid publication'; end if;
  perform pg_advisory_xact_lock(60906002);
  if exists (select 1 from public.demo_world_publications where id = p_id) then
    raise exception 'publication already exists; reload version';
  end if;
  if (select count(*) from public.demo_world_publications) >= 200
    or (select count(*) from public.demo_world_publications where owner_id = p_owner) >= 10 then raise exception 'publication limit'; end if;
  insert into public.demo_world_publications(id, owner_id, document) values(p_id, p_owner, p_document);
end;
$$;
revoke all on function public.demo_publish_world(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.demo_publish_world(text, uuid, jsonb) to service_role;
commit;
