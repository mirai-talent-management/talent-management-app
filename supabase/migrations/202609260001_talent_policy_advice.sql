-- Design proposal only. This local demo does not apply migrations to a live project.
-- These fields are self-reported and must never be inferred from Slack or activity logs.
alter table public.talent_profiles
  add column if not exists policy_advice_topics text[] not null default '{}',
  add column if not exists policy_advice_perspective text not null default ''
    check (char_length(policy_advice_perspective) <= 1000);

-- The existing owner-only update RLS policy still applies.
grant update (policy_advice_topics, policy_advice_perspective)
  on public.talent_profiles to authenticated;
