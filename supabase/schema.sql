begin;
create table if not exists public.gateready_demo_workspaces (
  workspace_id uuid primary key default gen_random_uuid(),
  revision integer not null default 1 check (revision > 0),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.gateready_demo_activity (
  activity_id bigint generated always as identity primary key,
  workspace_id uuid not null references public.gateready_demo_workspaces(workspace_id) on delete cascade,
  action text not null check (char_length(action) <= 100),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.gateready_demo_workspaces enable row level security;
alter table public.gateready_demo_activity enable row level security;
revoke all on table public.gateready_demo_workspaces from anon, authenticated;
revoke all on table public.gateready_demo_activity from anon, authenticated;
grant select, insert, update, delete on table public.gateready_demo_workspaces to service_role;
grant select, insert, update, delete on table public.gateready_demo_activity to service_role;
grant usage, select on sequence public.gateready_demo_activity_activity_id_seq to service_role;
commit;
