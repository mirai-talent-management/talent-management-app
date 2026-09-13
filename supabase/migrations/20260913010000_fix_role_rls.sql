-- Security fix: the "profiles_update_self" policy allowed a supporter to
-- rewrite their own `role` column (RLS only checked id = auth.uid(), with no
-- restriction on which columns changed). This blocks self-promotion while
-- still allowing role changes made outside a user session (invites trigger,
-- SQL editor / admin operations, where auth.uid() is null).
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role and auth.uid() is not null and not is_staff() then
    raise exception 'Only staff can change roles';
  end if;
  return new;
end;
$$;

create trigger prevent_role_self_change
  before update on profiles
  for each row execute function public.prevent_role_self_change();

-- Also close a related gap: the direct UPDATE policy on skill_endorsements
-- let a supporter flip status to 'approved' without going through
-- approve_endorsement(), leaving supporter_skills out of sync, and let them
-- rewrite endorser_id/tag_id on their own pending row. All status changes
-- must go through approve_endorsement()/reject_endorsement() from now on.
drop policy if exists "skill_endorsements_update_by_supporter" on skill_endorsements;
