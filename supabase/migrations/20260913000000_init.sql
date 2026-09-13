-- Initial schema for the supporter matching service.
-- Single-tenant (one office). See project plan for the full design rationale.

-- =========================================================
-- Types
-- =========================================================
create type user_role as enum ('supporter', 'staff');
create type tag_type as enum ('skill', 'interest');
create type skill_source as enum ('self', 'endorsed');
create type endorsement_status as enum ('pending', 'approved', 'rejected');
create type contact_channel as enum ('email');

-- =========================================================
-- Tables
-- =========================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'supporter',
  display_name text not null,
  email text not null,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table supporter_profiles (
  profile_id uuid primary key references profiles (id) on delete cascade,
  motivation_level smallint not null default 3 check (motivation_level between 1 and 5),
  experience text,
  availability text,
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  type tag_type not null,
  name text not null,
  normalized_name text not null,
  is_predefined boolean not null default false,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (type, normalized_name)
);

create table supporter_interests (
  supporter_id uuid not null references profiles (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (supporter_id, tag_id)
);

create table supporter_skills (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid not null references profiles (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete restrict,
  source skill_source not null,
  created_at timestamptz not null default now(),
  unique (supporter_id, tag_id, source)
);

create table skill_endorsements (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid not null references profiles (id) on delete cascade,
  endorser_id uuid not null references profiles (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  status endorsement_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint endorser_not_self check (supporter_id <> endorser_id),
  unique (supporter_id, endorser_id, tag_id)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz,
  location text,
  recruitment_details text,
  desired_persona text,
  required_headcount int,
  other_conditions text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_required_tags (
  activity_id uuid not null references activities (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (activity_id, tag_id)
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  invited_by uuid references profiles (id),
  role user_role not null default 'staff',
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table contact_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references profiles (id),
  supporter_id uuid references profiles (id),
  activity_id uuid references activities (id),
  channel contact_channel not null default 'email',
  subject text,
  body text,
  sent_at timestamptz not null default now()
);

-- =========================================================
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- =========================================================

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'staff'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
  v_role user_role := 'supporter';
begin
  select * into v_invite
  from invites
  where email = new.email
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    v_role := v_invite.role;
    update invites set accepted_at = now() where id = v_invite.id;
  end if;

  insert into profiles (id, role, display_name, email)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Approve/reject a pending endorsement. Only the endorsed supporter may call
-- these; approval is the only path that writes into supporter_skills with
-- source = 'endorsed' (direct inserts of that source are blocked by RLS).
create or replace function public.approve_endorsement(p_endorsement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supporter_id uuid;
  v_tag_id uuid;
begin
  select supporter_id, tag_id into v_supporter_id, v_tag_id
  from skill_endorsements
  where id = p_endorsement_id and status = 'pending';

  if v_supporter_id is null then
    raise exception 'Endorsement not found or already decided';
  end if;

  if v_supporter_id <> auth.uid() then
    raise exception 'Not authorized to approve this endorsement';
  end if;

  update skill_endorsements
  set status = 'approved', decided_at = now()
  where id = p_endorsement_id;

  insert into supporter_skills (supporter_id, tag_id, source)
  values (v_supporter_id, v_tag_id, 'endorsed')
  on conflict (supporter_id, tag_id, source) do nothing;
end;
$$;

create or replace function public.reject_endorsement(p_endorsement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supporter_id uuid;
begin
  select supporter_id into v_supporter_id
  from skill_endorsements
  where id = p_endorsement_id and status = 'pending';

  if v_supporter_id is null then
    raise exception 'Endorsement not found or already decided';
  end if;

  if v_supporter_id <> auth.uid() then
    raise exception 'Not authorized to reject this endorsement';
  end if;

  update skill_endorsements
  set status = 'rejected', decided_at = now()
  where id = p_endorsement_id;
end;
$$;

grant execute on function public.approve_endorsement(uuid) to authenticated;
grant execute on function public.reject_endorsement(uuid) to authenticated;

-- =========================================================
-- Row Level Security
-- =========================================================

alter table profiles enable row level security;
alter table supporter_profiles enable row level security;
alter table tags enable row level security;
alter table supporter_interests enable row level security;
alter table supporter_skills enable row level security;
alter table skill_endorsements enable row level security;
alter table activities enable row level security;
alter table activity_required_tags enable row level security;
alter table invites enable row level security;
alter table contact_logs enable row level security;

-- profiles: self read/update; staff can read everyone. Insert only via trigger.
create policy "profiles_select_self_or_staff" on profiles
  for select using (id = auth.uid() or is_staff());

create policy "profiles_update_self" on profiles
  for update using (id = auth.uid());

-- supporter_profiles: self manages; staff reads all.
create policy "supporter_profiles_select" on supporter_profiles
  for select using (profile_id = auth.uid() or is_staff());

create policy "supporter_profiles_upsert" on supporter_profiles
  for insert with check (profile_id = auth.uid());

create policy "supporter_profiles_update" on supporter_profiles
  for update using (profile_id = auth.uid());

-- tags: anyone authenticated can read and add new tags (predefined+free-add hybrid).
create policy "tags_select_all" on tags
  for select using (auth.uid() is not null);

create policy "tags_insert_authenticated" on tags
  for insert with check (auth.uid() is not null);

-- supporter_interests: self manages; staff reads all.
create policy "supporter_interests_select" on supporter_interests
  for select using (supporter_id = auth.uid() or is_staff());

create policy "supporter_interests_insert" on supporter_interests
  for insert with check (supporter_id = auth.uid());

create policy "supporter_interests_delete" on supporter_interests
  for delete using (supporter_id = auth.uid());

-- supporter_skills: self can add/remove only source='self' rows;
-- 'endorsed' rows are only ever written by approve_endorsement(). Staff reads all.
create policy "supporter_skills_select" on supporter_skills
  for select using (supporter_id = auth.uid() or is_staff());

create policy "supporter_skills_insert_self" on supporter_skills
  for insert with check (supporter_id = auth.uid() and source = 'self');

create policy "supporter_skills_delete_self" on supporter_skills
  for delete using (supporter_id = auth.uid() and source = 'self');

-- skill_endorsements: anyone can propose an endorsement for someone else;
-- only the endorsed supporter can update its status (approve/reject via RPC,
-- but direct UPDATE is also allowed here for flexibility/debugging).
create policy "skill_endorsements_select" on skill_endorsements
  for select using (
    supporter_id = auth.uid() or endorser_id = auth.uid() or is_staff()
  );

create policy "skill_endorsements_insert" on skill_endorsements
  for insert with check (endorser_id = auth.uid());

create policy "skill_endorsements_update_by_supporter" on skill_endorsements
  for update using (supporter_id = auth.uid());

-- activities: staff-only read/write (MVP keeps activities internal to staff).
create policy "activities_select_staff" on activities
  for select using (is_staff());

create policy "activities_insert_staff" on activities
  for insert with check (is_staff());

create policy "activities_update_staff" on activities
  for update using (is_staff());

create policy "activities_delete_staff" on activities
  for delete using (is_staff());

create policy "activity_required_tags_select_staff" on activity_required_tags
  for select using (is_staff());

create policy "activity_required_tags_insert_staff" on activity_required_tags
  for insert with check (is_staff());

create policy "activity_required_tags_delete_staff" on activity_required_tags
  for delete using (is_staff());

-- invites: staff-only.
create policy "invites_select_staff" on invites
  for select using (is_staff());

create policy "invites_insert_staff" on invites
  for insert with check (is_staff());

-- contact_logs: staff-only, and only their own sent logs.
create policy "contact_logs_select_staff" on contact_logs
  for select using (is_staff());

create policy "contact_logs_insert_staff" on contact_logs
  for insert with check (is_staff() and staff_id = auth.uid());
