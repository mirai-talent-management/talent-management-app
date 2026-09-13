-- Supporters need to look up other supporters by name to recommend skills
-- to them (screen: 他サポーターへのスキル付与提案), but the profiles RLS
-- policy only lets a user read their own row (or staff read everyone).
-- Expose a minimal directory (id + display_name only) to any authenticated
-- user via a view owned by the migration role, which bypasses RLS on the
-- underlying table (the standard Supabase pattern for this).
create view public_supporter_directory as
select id, display_name
from profiles
where role = 'supporter';

grant select on public_supporter_directory to authenticated;
