-- Run once in this Demo project's SQL editor. No grants to browser roles.
begin;
create table public.demo_image_assets (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  owner_id text not null,
  bucket text not null check (bucket in ('world-public', 'world-private')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  bytes integer not null default 2000000 check (bytes between 0 and 2000000),
  model text not null,
  created_at timestamptz not null default now()
);
alter table public.demo_image_assets enable row level security;
revoke all on public.demo_image_assets from public, anon, authenticated;
grant select, insert, update on public.demo_image_assets to service_role;
create index demo_image_assets_created on public.demo_image_assets(created_at);
create index demo_image_assets_owner on public.demo_image_assets(owner_id, created_at);

-- This transaction-level lock protects cross-instance duplicate and budget checks.
-- Failed/uncertain attempts still count: never silently pay twice after a timeout.
create function public.demo_claim_image(p_id text, p_owner text, p_bucket text, p_model text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare asset public.demo_image_assets; used_bytes bigint;
begin
  if p_id is null or p_owner is null or p_bucket is null or p_model is null
    or p_id !~ '^[a-f0-9]{64}$' or p_owner !~ '^[a-f0-9]{64}$'
    or p_bucket not in ('world-public', 'world-private') or length(p_model) not between 1 and 200 then
    raise exception 'invalid image request';
  end if;
  perform pg_advisory_xact_lock(60906001);
  select * into asset from public.demo_image_assets where id = p_id;
  if found then
    if asset.bucket <> p_bucket or (asset.bucket = 'world-private' and asset.owner_id <> p_owner) then
      return jsonb_build_object('status', 'denied');
    end if;
    return jsonb_build_object('status', asset.status, 'id', asset.id, 'model', asset.model);
  end if;
  if (select count(*) from public.demo_image_assets where created_at >= date_trunc('day', now())) >= 30
     or (select count(*) from public.demo_image_assets where owner_id = p_owner and created_at >= date_trunc('day', now())) >= 10 then
    return jsonb_build_object('status', 'daily_limit');
  end if;
  select coalesce(sum(bytes), 0) into used_bytes from public.demo_image_assets;
  -- Reserve maximum upload size before generation. A conservative Demo-only cap,
  -- not a guarantee for organization-wide storage or egress usage.
  if used_bytes + 2000000 > 300000000 then
    return jsonb_build_object('status', 'storage_limit');
  end if;
  insert into public.demo_image_assets(id, owner_id, bucket, model) values(p_id, p_owner, p_bucket, p_model);
  return jsonb_build_object('status', 'claimed', 'id', p_id);
end;
$$;
revoke all on function public.demo_claim_image(text, text, text, text) from public, anon, authenticated;
grant execute on function public.demo_claim_image(text, text, text, text) to service_role;
commit;
