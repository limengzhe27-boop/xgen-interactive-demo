-- Company gateway media: private, idempotent, bounded reservations across instances.
begin;
create table if not exists public.demo_media_assets (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  owner_id text not null check (owner_id ~ '^[a-f0-9]{64}$'),
  kind text not null check (kind in ('speech','video')),
  model text not null,
  status text not null default 'reserved' check (status in ('reserved','queued','ready','failed')),
  task_id text,
  bytes integer not null check (bytes between 0 and 20000000),
  created_at timestamptz not null default now()
);
alter table public.demo_media_assets enable row level security;
revoke all on public.demo_media_assets from public, anon, authenticated;
grant select, insert, update on public.demo_media_assets to service_role;
create index if not exists demo_media_owner_created on public.demo_media_assets(owner_id, created_at);
create or replace function public.demo_claim_media(p_id text, p_owner text, p_kind text, p_model text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare asset public.demo_media_assets; reservation integer; owner_limit integer; global_limit integer;
begin
  if p_id is null or p_id !~ '^[a-f0-9]{64}$' or p_owner is null or p_owner !~ '^[a-f0-9]{64}$'
    or p_kind is null or p_kind not in ('speech','video') or p_model is null or length(p_model) not between 1 and 120 then
    raise exception 'invalid media request';
  end if;
  perform pg_advisory_xact_lock(60908001);
  select * into asset from public.demo_media_assets where id=p_id;
  if found then
    if asset.owner_id<>p_owner or asset.kind<>p_kind or asset.model<>p_model then return jsonb_build_object('status','denied'); end if;
    return jsonb_build_object('status',asset.status);
  end if;
  reservation := case when p_kind='video' then 20000000 else 2000000 end;
  owner_limit := case when p_kind='video' then 2 else 20 end;
  global_limit := case when p_kind='video' then 6 else 80 end;
  if (select count(*) from public.demo_media_assets where kind=p_kind and created_at>=date_trunc('day',now()))>=global_limit
    or (select count(*) from public.demo_media_assets where kind=p_kind and owner_id=p_owner and created_at>=date_trunc('day',now()))>=owner_limit
    then return jsonb_build_object('status','daily_limit'); end if;
  if (select coalesce(sum(bytes),0) from public.demo_media_assets)+reservation>250000000
    then return jsonb_build_object('status','storage_limit'); end if;
  insert into public.demo_media_assets(id,owner_id,kind,model,bytes) values(p_id,p_owner,p_kind,p_model,reservation);
  return jsonb_build_object('status','claimed');
end;
$$;
revoke all on function public.demo_claim_media(text,text,text,text) from public,anon,authenticated;
grant execute on function public.demo_claim_media(text,text,text,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('demo-media-private','demo-media-private',false,20000000,array['audio/mpeg','video/mp4'])
on conflict(id) do nothing;
commit;
