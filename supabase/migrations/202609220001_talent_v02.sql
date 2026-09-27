-- Additive preparation for the authenticated v0.2 adapter. The local demo does
-- not connect to these tables. Existing v0.1 and ActionBoard tables are untouched.
begin;
create schema if not exists private;

-- The integration administrator synchronizes roles from verified ActionBoard
-- identity. Neither signup metadata nor profile edits may assign a staff role.
create table public.talent_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'supporter' check (role in ('staff','supporter'))
);
create function private.talent_is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.talent_memberships where user_id = (select auth.uid()) and role = 'staff');
$$;
revoke all on function private.talent_is_staff() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.talent_is_staff() to authenticated;

create table public.talent_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  kana text not null default '', headline text not null default '', location text not null default '',
  bio text not null default '' check (char_length(bio) <= 10000),
  interests text[] not null default '{}',
  motivation text not null default 'medium' check (motivation in ('high','medium','low')),
  hours_per_month integer not null default 0 check (hours_per_month between 0 and 744),
  experience jsonb not null default '[]' check (jsonb_typeof(experience) = 'array'),
  work_experience text not null default '' check (char_length(work_experience) <= 10000),
  personal_experience text not null default '' check (char_length(personal_experience) <= 10000),
  election_experience text not null default '' check (char_length(election_experience) <= 10000),
  community_experience text not null default '' check (char_length(community_experience) <= 10000),
  participation text[] not null default '{}' check (participation <@ array['election_active','regular','sometimes','remote','events_only','resting']::text[]),
  availability_details jsonb not null default '{"regions":[],"weekdays":[],"timeSlots":[],"remote":false,"onsite":false}' check (jsonb_typeof(availability_details) = 'object'),
  policy_interests text[] not null default '{}',
  joined_at timestamptz not null default now()
);
create table public.talent_contacts (
  profile_id uuid primary key references public.talent_profiles(id) on delete cascade,
  email text not null default '' check (char_length(email) <= 320),
  slack text not null default '' check (char_length(slack) <= 200)
);
create table public.talent_evidence (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  source text not null check (source in ('self','recommendation','ai','activity')),
  -- Only the final expression explicitly approved by its owner is public.
  -- Original interview transcripts, references and recommendation prose never go here.
  description text not null check (char_length(description) between 1 and 500),
  occurred_at timestamptz not null default now()
);
create table public.talent_skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  original_text text not null check (char_length(original_text) between 1 and 500),
  normalized_name text not null check (char_length(normalized_name) between 1 and 100),
  related_terms text[] not null default '{}',
  category text not null check (category in ('professional','personal','election','community','policy','strength')),
  source text not null check (source in ('self','recommendation','ai','activity')),
  evidence_id uuid references public.talent_evidence(id),
  approved_at timestamptz not null default now()
);
create table public.talent_recommendations (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  to_id uuid not null references public.talent_profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  source text not null default 'recommendation' check (source = 'recommendation'),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create table public.talent_suggestions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  original_text text not null check (char_length(original_text) between 1 and 20000),
  normalized_name text not null check (char_length(normalized_name) between 1 and 100),
  related_terms text[] not null default '{}',
  category text not null check (category in ('professional','personal','election','community','policy','strength')),
  source text not null check (source in ('recommendation','ai','activity')),
  origin text not null check (origin in ('interview','recommendation','action_board')),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  recommendation_id uuid references public.talent_recommendations(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), reviewed_at timestamptz,
  check ((origin = 'recommendation' and source = 'recommendation') or (origin = 'action_board' and source = 'activity') or (origin = 'interview' and source = 'ai'))
);
create table public.talent_interviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.talent_profiles(id) on delete cascade,
  messages jsonb not null default '[]' check (jsonb_typeof(messages) = 'array'),
  step integer not null default 0 check (step between 0 and 100),
  status text not null default 'active' check (status in ('active','paused','completed')),
  updated_at timestamptz not null default now()
);
create table public.talent_activities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);
create table public.talent_teams (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  proposal jsonb not null check (jsonb_typeof(proposal) = 'object'),
  status text not null default 'proposal' check (status in ('proposal','reviewed')),
  created_at timestamptz not null default now()
);

alter table public.talent_memberships enable row level security;
alter table public.talent_profiles enable row level security;
alter table public.talent_contacts enable row level security;
alter table public.talent_evidence enable row level security;
alter table public.talent_skills enable row level security;
alter table public.talent_recommendations enable row level security;
alter table public.talent_suggestions enable row level security;
alter table public.talent_interviews enable row level security;
alter table public.talent_activities enable row level security;
alter table public.talent_teams enable row level security;

create policy talent_membership_read on public.talent_memberships for select to authenticated using (user_id = (select auth.uid()));
create policy talent_profile_read on public.talent_profiles for select to authenticated using (true);
create policy talent_profile_update on public.talent_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy talent_contact_read on public.talent_contacts for select to authenticated using (profile_id = (select auth.uid()) or (select private.talent_is_staff()));
create policy talent_contact_update on public.talent_contacts for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy talent_skill_read on public.talent_skills for select to authenticated using (true);
create policy talent_self_skill_update on public.talent_skills for update to authenticated using (profile_id = (select auth.uid()) and source = 'self') with check (profile_id = (select auth.uid()) and source = 'self');
create policy talent_self_skill_delete on public.talent_skills for delete to authenticated using (profile_id = (select auth.uid()) and source = 'self');
create policy talent_evidence_read on public.talent_evidence for select to authenticated using (exists(select 1 from public.talent_skills where evidence_id = talent_evidence.id));
create policy talent_recommendation_read on public.talent_recommendations for select to authenticated using (from_id = (select auth.uid()) or to_id = (select auth.uid()));
create policy talent_recommendation_insert on public.talent_recommendations for insert to authenticated with check (from_id = (select auth.uid()) and to_id <> (select auth.uid()));
create policy talent_suggestion_owner_read on public.talent_suggestions for select to authenticated using (profile_id = (select auth.uid()));
create policy talent_interview_owner_read on public.talent_interviews for select to authenticated using (profile_id = (select auth.uid()));
create policy talent_interview_owner_insert on public.talent_interviews for insert to authenticated with check (profile_id = (select auth.uid()));
create policy talent_interview_owner_update on public.talent_interviews for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy talent_activity_read on public.talent_activities for select to authenticated using (true);
create policy talent_activity_staff_insert on public.talent_activities for insert to authenticated with check ((select private.talent_is_staff()) and created_by = (select auth.uid()));
create policy talent_activity_staff_update on public.talent_activities for update to authenticated using ((select private.talent_is_staff())) with check ((select private.talent_is_staff()));
create policy talent_team_staff_read on public.talent_teams for select to authenticated using ((select private.talent_is_staff()));
create policy talent_team_staff_insert on public.talent_teams for insert to authenticated with check ((select private.talent_is_staff()) and created_by = (select auth.uid()));
create policy talent_team_staff_update on public.talent_teams for update to authenticated using ((select private.talent_is_staff())) with check ((select private.talent_is_staff()));

revoke all on table public.talent_memberships,public.talent_profiles,public.talent_contacts,public.talent_evidence,
  public.talent_skills,public.talent_recommendations,public.talent_suggestions,public.talent_interviews,
  public.talent_activities,public.talent_teams from anon,authenticated;
grant select on table public.talent_memberships,public.talent_profiles,public.talent_contacts,public.talent_evidence,
  public.talent_skills,public.talent_recommendations,public.talent_suggestions,public.talent_interviews,
  public.talent_activities,public.talent_teams to authenticated;
grant update(name,kana,headline,location,bio,interests,motivation,hours_per_month,experience,work_experience,
  personal_experience,election_experience,community_experience,participation,availability_details,policy_interests) on public.talent_profiles to authenticated;
grant update(email,slack) on public.talent_contacts to authenticated;
grant update(original_text,normalized_name,related_terms,category),delete on public.talent_skills to authenticated;
grant insert(to_id,text) on public.talent_recommendations to authenticated;
grant insert(profile_id,messages,step,status),update(messages,step,status,updated_at) on public.talent_interviews to authenticated;
grant insert(data),update(data) on public.talent_activities to authenticated;
grant insert(proposal),update(proposal,status) on public.talent_teams to authenticated;

create index talent_skills_profile_idx on public.talent_skills(profile_id);
create unique index talent_self_skill_name_idx on public.talent_skills(profile_id,lower(normalized_name)) where source = 'self';
create index talent_skills_evidence_idx on public.talent_skills(evidence_id);
create index talent_suggestions_owner_idx on public.talent_suggestions(profile_id,status);
create index talent_recommendations_target_idx on public.talent_recommendations(to_id);

create function public.talent_add_self_skill(p_text text,p_normalized_name text,p_related_terms text[],p_category text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.talent_profiles where id = auth.uid()) then
    raise exception '本人のプロフィールが必要です。' using errcode = '42501';
  end if;
  insert into public.talent_skills(profile_id,original_text,normalized_name,related_terms,category,source)
  values(auth.uid(),btrim(p_text),btrim(p_normalized_name),coalesce(p_related_terms,'{}'),p_category,'self') returning id into result_id;
  return result_id;
end;
$$;
create function public.talent_review_suggestion(p_id uuid,p_decision text,p_final_text text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare candidate public.talent_suggestions%rowtype; final_text text; new_evidence uuid;
begin
  if auth.uid() is null then raise exception 'ログインが必要です。' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') then raise exception '確認結果が正しくありません。'; end if;
  select * into candidate from public.talent_suggestions where id = p_id for update;
  if not found or candidate.profile_id <> auth.uid() then raise exception '自分の候補だけ確認できます。' using errcode = '42501'; end if;
  if candidate.status = p_decision then return; end if;
  if candidate.status <> 'pending' then raise exception 'この候補は確認済みです。'; end if;
  final_text := btrim(coalesce(p_final_text,candidate.normalized_name));
  if char_length(final_text) not between 1 and 500 then raise exception '公開する表現は1〜500文字で指定してください。'; end if;
  if p_decision = 'approved' then
    insert into public.talent_evidence(profile_id,source,description)
    values(candidate.profile_id,candidate.source,final_text) returning id into new_evidence;
    insert into public.talent_skills(profile_id,original_text,normalized_name,related_terms,category,source,evidence_id)
    values(candidate.profile_id,final_text,candidate.normalized_name,candidate.related_terms,candidate.category,candidate.source,new_evidence);
  end if;
  update public.talent_suggestions set status = p_decision,reviewed_at = now() where id = p_id;
end;
$$;
revoke all on function public.talent_add_self_skill(text,text,text[],text),public.talent_review_suggestion(uuid,text,text) from public,anon,authenticated;
grant execute on function public.talent_add_self_skill(text,text,text[],text),public.talent_review_suggestion(uuid,text,text) to authenticated;

-- No signup trigger is installed: the future ActionBoard adapter provisions
-- talent_memberships/profiles/contacts after verifying auth.users identity.
-- Candidate creation and team building run only on the server.
commit;
