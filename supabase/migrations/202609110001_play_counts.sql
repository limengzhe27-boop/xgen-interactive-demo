begin;
-- Unique signed-in accounts, not visits or fabricated historical traffic.
create table public.demo_play_accounts (
  target text not null check (length(target) between 3 and 240),
  account_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (target, account_id)
);
alter table public.demo_play_accounts enable row level security;
revoke all on public.demo_play_accounts from public, anon, authenticated;
grant select, insert on public.demo_play_accounts to service_role;
create function public.demo_play_counts()
returns table(target text, players bigint)
language sql stable security definer set search_path = '' as $$
  select target, count(*) from public.demo_play_accounts group by target;
$$;
revoke all on function public.demo_play_counts() from public, anon, authenticated;
grant execute on function public.demo_play_counts() to service_role;
commit;
