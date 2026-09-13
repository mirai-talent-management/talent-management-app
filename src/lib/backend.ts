import type { Activity, Recommendation, Role, Supporter } from '../domain';
import { supabase } from './supabase';

function client() {
  if (!supabase) throw new Error('Supabase の接続設定がありません。');
  return supabase;
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function currentUser() {
  const { data, error } = await client().auth.getUser();
  check(error);
  if (!data.user) throw new Error('ログインが必要です。');
  return data.user;
}

type ProfileRow = {
  id: string; role: Role; name: string; kana: string; headline: string;
  location: string; bio: string; interests: string[];
  motivation: Supporter['motivation']; availability: string[];
  hours_per_month: number; joined_at: string; color: string;
};
type SkillRow = { id: string; name: string };
type SelfSkillRow = { supporter_id: string; skill_id: string };
type ContactRow = { supporter_id: string; email: string; slack: string };
type ExperienceRow = { supporter_id: string; title: string; description: string; date: string; position: number };
type RecommendationRow = {
  id: string; from_id: string; to_id: string; skill_id: string; message: string;
  status: Recommendation['status']; created_at: string;
};
type ActivityRow = {
  id: string; title: string; description: string; activity_date: string;
  location: string; recruitment: string; ideal_person: string; headcount: number;
  conditions: string; status: Activity['status'];
};

export async function loadBackendData(): Promise<{
  supporters: Supporter[];
  activities: Activity[];
  recommendations: Recommendation[];
  role: Role;
  selfId: string;
}> {
  const user = await currentUser();
  const db = client();
  // RLS returns contact details only for the owner or an authenticated staff member.
  const results = await Promise.all([
    db.from('profiles').select('*').order('joined_at'),
    db.from('profile_contacts').select('*'),
    db.from('skills').select('id,name'),
    db.from('supporter_skills').select('supporter_id,skill_id'),
    db.from('supporter_experiences').select('*').order('position'),
    db.from('recommendations').select('*').order('created_at', { ascending: false }),
    db.from('activities').select('*').order('activity_date'),
    db.from('activity_skills').select('activity_id,skill_id'),
  ]);
  results.forEach(result => check(result.error));
  const profiles = results[0].data as ProfileRow[];
  const contacts = new Map((results[1].data as ContactRow[]).map(row => [row.supporter_id, row]));
  const skills = new Map((results[2].data as SkillRow[]).map(row => [row.id, row.name]));
  const selfSkills = results[3].data as SelfSkillRow[];
  const experiences = results[4].data as ExperienceRow[];
  const recommendationRows = results[5].data as RecommendationRow[];
  const activityRows = results[6].data as ActivityRow[];
  const activitySkills = results[7].data as { activity_id: string; skill_id: string }[];
  const self = profiles.find(profile => profile.id === user.id);
  if (!self) throw new Error('プロフィールが見つかりません。Supabase の初期マイグレーションを確認してください。');

  const recommendations: Recommendation[] = recommendationRows.map(row => ({
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    skill: skills.get(row.skill_id) ?? '',
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));

  const supporters: Supporter[] = profiles.filter(profile => profile.role === 'supporter').map(profile => {
    const mergedSkills = new Map<string, Supporter['skills'][number]>();
    for (const row of selfSkills.filter(row => row.supporter_id === profile.id)) {
      const name = skills.get(row.skill_id);
      if (name) mergedSkills.set(name, { name, source: 'self', endorsers: [] });
    }
    for (const rec of recommendations.filter(rec => rec.toId === profile.id && rec.status === 'approved')) {
      const skill = mergedSkills.get(rec.skill) ?? { name: rec.skill, source: 'recommended' as const, endorsers: [] };
      if (!skill.endorsers.includes(rec.fromId)) skill.endorsers.push(rec.fromId);
      mergedSkills.set(rec.skill, skill);
    }
    return {
      id: profile.id,
      name: profile.name,
      kana: profile.kana,
      headline: profile.headline,
      location: profile.location,
      bio: profile.bio,
      skills: [...mergedSkills.values()],
      interests: profile.interests,
      motivation: profile.motivation,
      availability: profile.availability,
      hoursPerMonth: profile.hours_per_month,
      experience: experiences.filter(row => row.supporter_id === profile.id)
        .map(({ title, description, date }) => ({ title, description, date })),
      email: contacts.get(profile.id)?.email ?? '',
      slack: contacts.get(profile.id)?.slack ?? '',
      joinedAt: profile.joined_at,
      color: profile.color,
    };
  });
  const activities: Activity[] = activityRows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.activity_date,
    location: row.location,
    recruitment: row.recruitment,
    requiredSkills: activitySkills.filter(skill => skill.activity_id === row.id)
      .map(skill => skills.get(skill.skill_id) ?? '').filter(Boolean),
    idealPerson: row.ideal_person,
    headcount: row.headcount,
    conditions: row.conditions,
    status: row.status,
  }));
  return { supporters, activities, recommendations, role: self.role, selfId: user.id };
}

export async function saveBackendProfile(profile: Supporter): Promise<void> {
  const user = await currentUser();
  if (profile.id !== user.id) throw new Error('自分のプロフィールだけ編集できます。');
  const { error } = await client().rpc('save_supporter_profile', { p_profile: profile });
  check(error);
}

export async function saveBackendActivity(activity: Activity): Promise<void> {
  const { error } = await client().rpc('save_activity', { p_activity: activity });
  check(error);
}

export async function submitBackendRecommendation(rec: Recommendation): Promise<void> {
  const user = await currentUser();
  if (rec.fromId !== user.id) throw new Error('自分の名前でのみ推薦できます。');
  const { error } = await client().rpc('submit_recommendation', {
    p_id: rec.id, p_to_id: rec.toId, p_skill: rec.skill, p_message: rec.message,
  });
  check(error);
}

export async function reviewBackendRecommendation(id: string, approve: boolean): Promise<void> {
  const { error } = await client().rpc('review_recommendation', { p_id: id, p_approve: approve });
  check(error);
}
