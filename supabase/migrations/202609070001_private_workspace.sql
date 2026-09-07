begin;
create table public.demo_private_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  document jsonb check (document is null or octet_length(document::text) <= 2200000),
  request_id uuid not null,
  updated_at timestamptz not null default now()
);
alter table public.demo_private_workspaces enable row level security;
revoke all on public.demo_private_workspaces from public, anon, authenticated;
grant select on public.demo_private_workspaces to authenticated;
create policy workspace_owner_read on public.demo_private_workspaces for select to authenticated using ((select auth.uid()) = owner_id);

-- One small snapshot per account. A tombstone retains revision after deletion.
-- No browser-supplied owner ID and no service-role bypass in the application.
create function public.demo_save_workspace(p_document jsonb, p_expected_revision bigint, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  who uuid := auth.uid();
  previous public.demo_private_workspaces%rowtype;
  next_revision bigint;
begin
  if who is null then raise exception 'login required'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_request_id is null then raise exception 'invalid revision'; end if;
  if p_document is not null and (jsonb_typeof(p_document) <> 'object' or octet_length(p_document::text) > 2200000) then raise exception 'invalid snapshot'; end if;
  perform pg_advisory_xact_lock(60907001);
  select * into previous from public.demo_private_workspaces where owner_id = who;
  if previous.request_id = p_request_id and previous.document is not distinct from p_document then
    return jsonb_build_object('status','saved','revision',previous.revision,'updatedAt',previous.updated_at);
  end if;
  if coalesce(previous.revision,0) <> p_expected_revision then
    return jsonb_build_object('status','conflict','revision',coalesce(previous.revision,0));
  end if;
  if previous.owner_id is null and (select count(*) from public.demo_private_workspaces) >= 50 then
    return jsonb_build_object('status','quota');
  end if;
  next_revision := coalesce(previous.revision,0) + 1;
  insert into public.demo_private_workspaces(owner_id,revision,document,request_id) values(who,next_revision,p_document,p_request_id)
    on conflict(owner_id) do update set revision = excluded.revision, document = excluded.document, request_id = excluded.request_id, updated_at = now();
  return jsonb_build_object('status','saved','revision',next_revision,'updatedAt',now());
end;
$$;
revoke all on function public.demo_save_workspace(jsonb,bigint,uuid) from public, anon, authenticated;
grant execute on function public.demo_save_workspace(jsonb,bigint,uuid) to authenticated;
commit;
