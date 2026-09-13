-- Run once in the Supabase SQL Editor, before creating application users.
-- All browser writes go through the four checked, transactional RPCs below.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'supporter' check (role in ('supporter', 'staff')),
  name text not null default '新しいサポーター' check (char_length(name) between 1 and 100),
  kana text not null default '' check (char_length(kana) <= 100),
  headline text not null default '' check (char_length(headline) <= 200),
  location text not null default '' check (char_length(location) <= 200),
  bio text not null default '' check (char_length(bio) <= 10000),
  interests text[] not null default '{}',
  motivation text not null default 'medium' check (motivation in ('high', 'medium', 'low')),
  availability text[] not null default '{}',
  hours_per_month integer not null default 0 check (hours_per_month between 0 and 744),
  joined_at timestamptz not null default now(),
  color text not null default '#7BA59A' check (char_length(color) <= 80)
);

create table public.profile_contacts (
  supporter_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null default '' check (char_length(email) <= 320),
  slack text not null default '' check (char_length(slack) <= 200)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  normalized_name text generated always as (lower(name)) stored unique
);

-- This table stores only self-declared skills. Endorsements come exclusively
-- from approved recommendations, so a profile update cannot forge their source.
create table public.supporter_skills (
  supporter_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id),
  primary key (supporter_id, skill_id)
);

create table public.supporter_experiences (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  date text not null default '' check (char_length(date) <= 100),
  position integer not null default 0
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  activity_date text not null check (char_length(activity_date) between 1 and 100),
  location text not null default '' check (char_length(location) <= 200),
  recruitment text not null default '' check (char_length(recruitment) <= 10000),
  ideal_person text not null default '' check (char_length(ideal_person) <= 10000),
  headcount integer not null check (headcount between 1 and 10000),
  conditions text not null default '' check (char_length(conditions) <= 10000),
  status text not null default 'recruiting' check (status in ('recruiting', 'closed')),
  created_at timestamptz not null default now()
);

create table public.activity_skills (
  activity_id uuid not null references public.activities(id) on delete cascade,
  skill_id uuid not null references public.skills(id),
  primary key (activity_id, skill_id)
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  check (from_id <> to_id),
  unique (from_id, to_id, skill_id)
);

create index supporter_skills_skill_idx on public.supporter_skills(skill_id);
create index supporter_experiences_owner_idx on public.supporter_experiences(supporter_id);
create index activity_skills_skill_idx on public.activity_skills(skill_id);
create index recommendations_recipient_idx on public.recommendations(to_id, status);
create index recommendations_skill_idx on public.recommendations(skill_id);

create function private.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'staff'
  );
$$;
revoke all on function private.is_staff() from public;
grant execute on function private.is_staff() to authenticated;

alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.skills enable row level security;
alter table public.supporter_skills enable row level security;
alter table public.supporter_experiences enable row level security;
alter table public.activities enable row level security;
alter table public.activity_skills enable row level security;
alter table public.recommendations enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy contacts_read on public.profile_contacts for select to authenticated
  using (supporter_id = (select auth.uid()) or (select private.is_staff()));
create policy skills_read on public.skills for select to authenticated using (true);
create policy self_skills_read on public.supporter_skills for select to authenticated using (true);
create policy experiences_read on public.supporter_experiences for select to authenticated using (true);
create policy activities_read on public.activities for select to authenticated using (true);
create policy activity_skills_read on public.activity_skills for select to authenticated using (true);
create policy recommendations_read on public.recommendations for select to authenticated
  using (status = 'approved' or from_id = (select auth.uid()) or to_id = (select auth.uid()) or (select private.is_staff()));

-- Do not grant direct INSERT/UPDATE/DELETE: this also protects role, provenance,
-- recommendation status, author IDs and server-managed creation timestamps.
revoke all on table public.profiles, public.profile_contacts, public.skills,
  public.supporter_skills, public.supporter_experiences, public.activities,
  public.activity_skills, public.recommendations from anon, authenticated;
grant select on table public.profiles, public.profile_contacts, public.skills,
  public.supporter_skills, public.supporter_experiences, public.activities,
  public.activity_skills, public.recommendations to authenticated;

create function public.handle_new_supporter()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Signup metadata never controls role. An administrator assigns staff access.
  insert into public.profiles(id, name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), '新しいサポーター'), 100));
  insert into public.profile_contacts(supporter_id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;
revoke all on function public.handle_new_supporter() from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_supporter();

-- Also supports installing the migration after an Auth account was created.
insert into public.profiles(id, name)
select id, left(coalesce(nullif(btrim(raw_user_meta_data->>'name'), ''), '新しいサポーター'), 100)
from auth.users on conflict (id) do nothing;
insert into public.profile_contacts(supporter_id, email)
select id, coalesce(email, '') from auth.users on conflict (supporter_id) do nothing;

create function public.save_supporter_profile(p_profile jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or (p_profile->>'id')::uuid is distinct from actor then
    raise exception '自分のプロフィールだけ編集できます。' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = actor for update;
  if not found then raise exception 'プロフィールが見つかりません。'; end if;
  if jsonb_array_length(coalesce(p_profile->'skills', '[]'::jsonb)) > 60
    or jsonb_array_length(coalesce(p_profile->'experience', '[]'::jsonb)) > 50
    or jsonb_array_length(coalesce(p_profile->'interests', '[]'::jsonb)) > 60
    or jsonb_array_length(coalesce(p_profile->'availability', '[]'::jsonb)) > 30 then
    raise exception '登録できる項目数を超えています。';
  end if;

  update public.profiles set
    name = btrim(p_profile->>'name'),
    kana = coalesce(p_profile->>'kana', ''),
    headline = coalesce(p_profile->>'headline', ''),
    location = coalesce(p_profile->>'location', ''),
    bio = coalesce(p_profile->>'bio', ''),
    interests = array(select distinct btrim(value) from jsonb_array_elements_text(coalesce(p_profile->'interests', '[]'::jsonb)) where btrim(value) <> ''),
    motivation = coalesce(p_profile->>'motivation', 'medium'),
    availability = array(select distinct btrim(value) from jsonb_array_elements_text(coalesce(p_profile->'availability', '[]'::jsonb)) where btrim(value) <> ''),
    hours_per_month = coalesce((p_profile->>'hoursPerMonth')::integer, 0),
    color = coalesce(p_profile->>'color', '#7BA59A')
  where id = actor;

  update public.profile_contacts set
    email = btrim(coalesce(p_profile->>'email', '')),
    slack = btrim(coalesce(p_profile->>'slack', ''))
  where supporter_id = actor;

  insert into public.skills(name)
  select distinct btrim(value->>'name')
  from jsonb_array_elements(coalesce(p_profile->'skills', '[]'::jsonb))
  where value->>'source' = 'self' and btrim(value->>'name') <> ''
  on conflict do nothing;
  delete from public.supporter_skills where supporter_id = actor;
  insert into public.supporter_skills(supporter_id, skill_id)
  select distinct actor, skills.id from public.skills
  join jsonb_array_elements(coalesce(p_profile->'skills', '[]'::jsonb)) entry
    on skills.normalized_name = lower(btrim(entry->>'name'))
  where entry->>'source' = 'self';
  -- Client-supplied endorsers and recommended skills are intentionally ignored.

  delete from public.supporter_experiences where supporter_id = actor;
  insert into public.supporter_experiences(supporter_id, title, description, date, position)
  select actor, btrim(value->>'title'), coalesce(value->>'description', ''),
    coalesce(value->>'date', ''), ordinality::integer
  from jsonb_array_elements(coalesce(p_profile->'experience', '[]'::jsonb)) with ordinality
  where btrim(value->>'title') <> '';
end;
$$;

create function public.save_activity(p_activity jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_activity_id uuid := (p_activity->>'id')::uuid;
begin
  if actor is null or not private.is_staff() then
    raise exception '活動を登録・編集できるのは議員・スタッフだけです。' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p_activity->'requiredSkills', '[]'::jsonb)) > 60 then
    raise exception '必要スキルは60件以内で指定してください。';
  end if;
  insert into public.activities(id, created_by, title, description, activity_date, location,
    recruitment, ideal_person, headcount, conditions, status)
  values (target_activity_id, actor, btrim(p_activity->>'title'), coalesce(p_activity->>'description', ''),
    p_activity->>'date', coalesce(p_activity->>'location', ''), coalesce(p_activity->>'recruitment', ''),
    coalesce(p_activity->>'idealPerson', ''), (p_activity->>'headcount')::integer,
    coalesce(p_activity->>'conditions', ''), coalesce(p_activity->>'status', 'recruiting'))
  on conflict (id) do update set
    title = excluded.title, description = excluded.description, activity_date = excluded.activity_date,
    location = excluded.location, recruitment = excluded.recruitment, ideal_person = excluded.ideal_person,
    headcount = excluded.headcount, conditions = excluded.conditions, status = excluded.status;

  insert into public.skills(name)
  select distinct btrim(value) from jsonb_array_elements_text(coalesce(p_activity->'requiredSkills', '[]'::jsonb))
  where btrim(value) <> '' on conflict do nothing;
  delete from public.activity_skills where activity_skills.activity_id = target_activity_id;
  insert into public.activity_skills(activity_id, skill_id)
  select distinct target_activity_id, skills.id from public.skills
  join jsonb_array_elements_text(coalesce(p_activity->'requiredSkills', '[]'::jsonb)) entry
    on skills.normalized_name = lower(btrim(entry));
end;
$$;

create function public.submit_recommendation(p_id uuid, p_to_id uuid, p_skill text, p_message text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  selected_skill uuid;
begin
  if actor is null then raise exception 'ログインが必要です。' using errcode = '42501'; end if;
  if actor = p_to_id then raise exception '自分へのスキル推薦はできません。'; end if;
  if not exists (select 1 from public.profiles where id = actor and role = 'supporter') then
    raise exception 'サポーターとしてログインしてください。' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_to_id and role = 'supporter') then
    raise exception '推薦先のサポーターが見つかりません。';
  end if;
  insert into public.skills(name) values (btrim(p_skill)) on conflict do nothing;
  select id into selected_skill from public.skills where normalized_name = lower(btrim(p_skill));
  if exists (select 1 from public.recommendations
    where from_id = actor and to_id = p_to_id and skill_id = selected_skill) then
    raise exception 'このスキルはすでに推薦しています。';
  end if;
  insert into public.recommendations(id, from_id, to_id, skill_id, message)
  values (p_id, actor, p_to_id, selected_skill, coalesce(p_message, ''));
end;
$$;

create function public.review_recommendation(p_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  recommendation public.recommendations%rowtype;
  requested_status text := case when p_approve then 'approved' else 'rejected' end;
begin
  if actor is null then raise exception 'ログインが必要です。' using errcode = '42501'; end if;
  if p_approve is null then raise exception '承認または辞退を指定してください。'; end if;
  select * into recommendation from public.recommendations where id = p_id for update;
  if not found or recommendation.to_id <> actor then
    raise exception '自分に届いた推薦だけ確認できます。' using errcode = '42501';
  end if;
  if recommendation.status = requested_status then return; end if;
  if recommendation.status <> 'pending' then raise exception 'この推薦は確認済みです。'; end if;
  update public.recommendations set status = requested_status where id = p_id;
  -- Approved rows are the source of truth for endorsed skills. No self-declared
  -- skill is overwritten, and repeating the same approval never adds a vote.
end;
$$;

revoke all on function public.save_supporter_profile(jsonb), public.save_activity(jsonb),
  public.submit_recommendation(uuid, uuid, text, text), public.review_recommendation(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.save_supporter_profile(jsonb), public.save_activity(jsonb),
  public.submit_recommendation(uuid, uuid, text, text), public.review_recommendation(uuid, boolean)
  to authenticated;

commit;
