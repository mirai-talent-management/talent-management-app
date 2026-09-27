-- Preparation only. The localhost demos still use independent JSON repositories.
begin;

alter table public.talent_skills add column recommendation_id uuid references public.talent_recommendations(id) on delete set null;
alter table public.talent_skills add constraint talent_skill_recommendation_source
  check (recommendation_id is null or source = 'recommendation');

create table public.talent_skill_agreements (
  skill_id uuid not null references public.talent_skills(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(skill_id,actor_id)
);
create index talent_agreements_actor_idx on public.talent_skill_agreements(actor_id);
alter table public.talent_skill_agreements enable row level security;
-- Direct reads reveal only one's own click. Public totals use the dedicated RPC.
create policy talent_agreement_owner_read on public.talent_skill_agreements
  for select to authenticated using (actor_id = (select auth.uid()));
revoke all on table public.talent_skill_agreements from public,anon,authenticated;
grant select on table public.talent_skill_agreements to authenticated;

-- Preserve the original owner's review transaction while recording provenance.
create or replace function public.talent_review_suggestion(p_id uuid,p_decision text,p_final_text text default null)
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
    insert into public.talent_skills(profile_id,original_text,normalized_name,related_terms,category,source,evidence_id,recommendation_id)
    values(candidate.profile_id,final_text,candidate.normalized_name,candidate.related_terms,candidate.category,candidate.source,new_evidence,candidate.recommendation_id);
  end if;
  update public.talent_suggestions set status = p_decision,reviewed_at = now() where id = p_id;
end;
$$;

create function public.talent_agreement_count(p_skill_id uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.talent_skill_agreements a
  join public.talent_skills s on s.id = a.skill_id
  join public.talent_recommendations r on r.id = s.recommendation_id and r.to_id = s.profile_id
  where s.id = p_skill_id and s.source = 'recommendation' and s.approved_at is not null;
$$;

create function public.talent_toggle_skill_agreement(p_skill_id uuid)
returns table(agreed boolean,agreement_count bigint)
language plpgsql security definer set search_path = '' as $$
declare target_id uuid; recommender_id uuid; removed_count integer;
begin
  if auth.uid() is null then raise exception 'ログインが必要です。' using errcode = '42501'; end if;
  if not exists(select 1 from public.talent_memberships m where m.user_id = auth.uid() and m.role in ('supporter','staff')) then
    raise exception '登録されたアカウントで操作してください。' using errcode = '42501';
  end if;
  select s.profile_id,r.from_id into target_id,recommender_id
  from public.talent_skills s join public.talent_recommendations r
    on r.id = s.recommendation_id and r.to_id = s.profile_id
  where s.id = p_skill_id and s.source = 'recommendation' and s.approved_at is not null
  for update of s;
  if not found then raise exception '承認済みの推薦スキルが見つかりません。'; end if;
  if auth.uid() = target_id or auth.uid() = recommender_id then
    raise exception '本人と推薦者は同意を追加できません。' using errcode = '42501';
  end if;
  delete from public.talent_skill_agreements a where a.skill_id = p_skill_id and a.actor_id = auth.uid();
  get diagnostics removed_count = row_count;
  agreed := removed_count = 0;
  if agreed then insert into public.talent_skill_agreements(skill_id,actor_id) values(p_skill_id,auth.uid()); end if;
  select count(*) into agreement_count from public.talent_skill_agreements a where a.skill_id = p_skill_id;
  return next;
end;
$$;
revoke all on function public.talent_agreement_count(uuid),public.talent_toggle_skill_agreement(uuid) from public,anon,authenticated;
grant execute on function public.talent_agreement_count(uuid),public.talent_toggle_skill_agreement(uuid) to authenticated;
commit;
