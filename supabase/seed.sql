-- Dummy/demo data for local development and design review.
-- Creates 5 fake supporters directly in auth.users (bypassing real signup —
-- these accounts are never meant to log in) plus their skills, interests,
-- motivation, peer endorsements, and 3 sample activities with required tags.
-- Safe to re-run: every insert uses ON CONFLICT DO NOTHING.

-- 1) Dummy supporter accounts (auth.users insert triggers handle_new_user,
--    which creates the matching profiles row with role='supporter').
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) values
('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','seed-tanaka@example.com','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','seed-sato@example.com','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','seed-suzuki@example.com','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','seed-takahashi@example.com','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','seed-watanabe@example.com','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','')
on conflict (id) do nothing;

-- 2) Display names / bios (trigger initially fills these from the email prefix)
update profiles set display_name = '田中 花子', bio = '地域のイベント運営とSNS発信が得意です。' where id = 'a0000000-0000-0000-0000-000000000001';
update profiles set display_name = '佐藤 健一', bio = '広報誌の編集を長年担当してきました。' where id = 'a0000000-0000-0000-0000-000000000002';
update profiles set display_name = '鈴木 一郎', bio = 'デザインと動画編集が得意です。' where id = 'a0000000-0000-0000-0000-000000000003';
update profiles set display_name = '高橋 美咲', bio = 'イベントの企画・会場設営の経験が豊富です。' where id = 'a0000000-0000-0000-0000-000000000004';
update profiles set display_name = '渡辺 直樹', bio = '環境問題に関心があります。' where id = 'a0000000-0000-0000-0000-000000000005';

-- 3) Motivation / experience / availability
insert into supporter_profiles (profile_id, motivation_level, experience, availability) values
('a0000000-0000-0000-0000-000000000001', 5, '学園祭実行委員でSNS広報を担当', '平日夜、土日'),
('a0000000-0000-0000-0000-000000000002', 3, '町内会の広報誌作成を3年担当', '土日のみ'),
('a0000000-0000-0000-0000-000000000003', 4, 'フリーランスでデザイン・動画編集を受注', '平日夜'),
('a0000000-0000-0000-0000-000000000004', 5, '地域イベントの企画運営を10回以上経験', '月2回程度、土日'),
('a0000000-0000-0000-0000-000000000005', 2, '特になし', '不定期')
on conflict (profile_id) do nothing;

-- 4) Tags (skill + interest)
insert into tags (type, name, normalized_name, is_predefined) values
('skill','SNS','sns',true),
('skill','Instagram','instagram',true),
('skill','動画編集','動画編集',true),
('skill','広報','広報',true),
('skill','イベント運営','イベント運営',true),
('skill','デザイン','デザイン',true),
('skill','会場設営','会場設営',true),
('interest','イベント運営','イベント運営',true),
('interest','広報','広報',true),
('interest','高齢者福祉','高齢者福祉',true),
('interest','環境問題','環境問題',true)
on conflict (type, normalized_name) do nothing;

-- 5) Self-reported skills
insert into supporter_skills (supporter_id, tag_id, source)
select v.supporter_id, t.id, 'self'
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid,'SNS'),
  ('a0000000-0000-0000-0000-000000000001'::uuid,'Instagram'),
  ('a0000000-0000-0000-0000-000000000001'::uuid,'動画編集'),
  ('a0000000-0000-0000-0000-000000000002'::uuid,'SNS'),
  ('a0000000-0000-0000-0000-000000000002'::uuid,'広報'),
  ('a0000000-0000-0000-0000-000000000003'::uuid,'Instagram'),
  ('a0000000-0000-0000-0000-000000000003'::uuid,'動画編集'),
  ('a0000000-0000-0000-0000-000000000003'::uuid,'デザイン'),
  ('a0000000-0000-0000-0000-000000000004'::uuid,'イベント運営'),
  ('a0000000-0000-0000-0000-000000000004'::uuid,'会場設営'),
  ('a0000000-0000-0000-0000-000000000005'::uuid,'SNS')
) as v(supporter_id, tag_name)
join tags t on t.type = 'skill' and t.name = v.tag_name
on conflict (supporter_id, tag_id, source) do nothing;

-- 6) Interests
insert into supporter_interests (supporter_id, tag_id)
select v.supporter_id, t.id
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid,'イベント運営'),
  ('a0000000-0000-0000-0000-000000000002'::uuid,'広報'),
  ('a0000000-0000-0000-0000-000000000003'::uuid,'広報'),
  ('a0000000-0000-0000-0000-000000000004'::uuid,'高齢者福祉'),
  ('a0000000-0000-0000-0000-000000000005'::uuid,'環境問題')
) as v(supporter_id, tag_name)
join tags t on t.type = 'interest' and t.name = v.tag_name
on conflict (supporter_id, tag_id) do nothing;

-- 7) Peer endorsements (pre-approved), mirrored into supporter_skills the
--    same way approve_endorsement() does.
insert into skill_endorsements (supporter_id, endorser_id, tag_id, status, decided_at)
select v.supporter_id, v.endorser_id, t.id, 'approved', now()
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-000000000002'::uuid,'動画編集'),
  ('a0000000-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-000000000003'::uuid,'動画編集'),
  ('a0000000-0000-0000-0000-000000000003'::uuid,'a0000000-0000-0000-0000-000000000001'::uuid,'デザイン')
) as v(supporter_id, endorser_id, tag_name)
join tags t on t.type = 'skill' and t.name = v.tag_name
on conflict (supporter_id, endorser_id, tag_id) do nothing;

insert into supporter_skills (supporter_id, tag_id, source)
select supporter_id, tag_id, 'endorsed' from skill_endorsements where status = 'approved'
on conflict (supporter_id, tag_id, source) do nothing;

-- 8) Sample activities (created_by the first staff account found)
insert into activities (title, description, starts_at, location, recruitment_details, desired_persona, required_headcount, created_by)
select '駅前でのSNS発信イベント告知', 'Instagramで駅前イベントの告知を行います。', now() + interval '14 days', '地域のイベントスペース', '告知用の動画・画像を作成し、SNSで発信', 'SNS発信に慣れている方', 2, id
from profiles where role = 'staff' limit 1;

insert into activities (title, description, starts_at, location, recruitment_details, desired_persona, required_headcount, created_by)
select '街頭イベントの運営サポート', '当日の会場設営・受付を担当していただきます。', now() + interval '21 days', '市民会館', '会場設営・受付・誘導', '体力に自信のある方歓迎', 4, id
from profiles where role = 'staff' limit 1;

insert into activities (title, description, starts_at, location, recruitment_details, desired_persona, required_headcount, created_by)
select '広報誌のデザイン刷新', '広報誌のデザインを一新するプロジェクトです。', now() + interval '30 days', 'リモート可', 'デザイン案の作成', 'デザインツールが使える方', 1, id
from profiles where role = 'staff' limit 1;

-- 9) Required skill tags per activity
insert into activity_required_tags (activity_id, tag_id)
select a.id, t.id
from activities a
join tags t on t.type = 'skill'
where a.title = '駅前でのSNS発信イベント告知' and t.name in ('SNS','Instagram','動画編集','広報')
on conflict (activity_id, tag_id) do nothing;

insert into activity_required_tags (activity_id, tag_id)
select a.id, t.id
from activities a
join tags t on t.type = 'skill'
where a.title = '街頭イベントの運営サポート' and t.name in ('イベント運営','会場設営')
on conflict (activity_id, tag_id) do nothing;

insert into activity_required_tags (activity_id, tag_id)
select a.id, t.id
from activities a
join tags t on t.type = 'skill'
where a.title = '広報誌のデザイン刷新' and t.name in ('広報','デザイン')
on conflict (activity_id, tag_id) do nothing;
