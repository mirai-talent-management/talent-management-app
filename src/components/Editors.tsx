"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  AVAILABILITY_OPTIONS,
  INTEREST_OPTIONS,
  MOTIVATION_LABELS,
  SKILL_OPTIONS,
  type Activity,
  type Supporter,
} from "../domain";

type TagPickerProps = {
  legend: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  allowCustom?: boolean;
  hint?: string;
};

function TagPicker({ legend, options, values, onChange, allowCustom, hint }: TagPickerProps) {
  const id = useId();
  const [custom, setCustom] = useState("");
  const choices = Array.from(new Set([...options, ...values]));
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const addCustom = () => {
    const next = custom.trim();
    if (!next) return;
    if (!values.includes(next)) onChange([...values, next]);
    setCustom("");
  };

  return (
    <fieldset className="form-section">
      <legend className="label">{legend}</legend>
      {hint && <p className="muted">{hint}</p>}
      <div className="tag-picker">
        {choices.map((choice) => (
          <button className={`tag-choice${values.includes(choice) ? " selected" : ""}`} key={choice} type="button" aria-pressed={values.includes(choice)} onClick={() => toggle(choice)}>
            {values.includes(choice) && <Check size={13} aria-hidden="true" />}{choice}
          </button>
        ))}
      </div>
      {allowCustom && (
        <div className="form-field" style={{ marginTop: 12 }}>
          <label className="label" htmlFor={id}>ほかのスキルを追加</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" id={id} value={custom} maxLength={40} placeholder="例：手話、翻訳、写真撮影" onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); addCustom(); } }} />
            <button type="button" className="button secondary" onClick={addCustom} disabled={!custom.trim()} aria-label={`${legend}にスキルを追加`}><Plus size={16} aria-hidden="true" />追加</button>
          </div>
        </div>
      )}
    </fieldset>
  );
}

function SaveActions({ busy, error, onCancel, label }: { busy: boolean; error: string; onCancel: () => void; label: string }) {
  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>キャンセル</button>
        <button type="submit" className="button primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{busy ? "保存しています…" : label}</button>
      </div>
    </>
  );
}

export function ProfileEditor({ profile, onSave, onCancel }: {
  profile: Supporter;
  onSave: (profile: Supporter) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Supporter>(() => ({ ...profile, experience: profile.experience.map((item) => ({ ...item })) }));
  const [selfSkills, setSelfSkills] = useState(() => profile.skills.filter((skill) => skill.source === "self").map((skill) => skill.name));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const update = <Key extends keyof Supporter>(key: Key, value: Supporter[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateExperience = (index: number, key: keyof Supporter["experience"][number], value: string) => {
    setDraft((current) => ({ ...current, experience: current.experience.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  };
  const recommendedSkills = profile.skills.filter((skill) => skill.source === "recommended" || skill.endorsers.length > 0);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const name = draft.name.trim();
    const headline = draft.headline.trim();
    const location = draft.location.trim();
    const email = draft.email.trim();
    if (!name || !headline || !location || !email) { setError("お名前、ひとこと紹介、活動エリア、メールアドレスを入力してください。"); return; }
    if (draft.experience.some((item) => !item.title.trim())) { setError("経験・実績のタイトルを入力してください。空の項目は削除できます。"); return; }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      // Endorsements remain intact when a self-registered skill is removed.
      const skills: Supporter["skills"] = selfSkills.map((name) => ({
        name,
        source: "self",
        endorsers: [...(profile.skills.find((skill) => skill.name === name)?.endorsers ?? [])],
      }));
      for (const skill of profile.skills) {
        if (!selfSkills.includes(skill.name) && (skill.source === "recommended" || skill.endorsers.length > 0)) {
          skills.push({ ...skill, source: "recommended", endorsers: [...skill.endorsers] });
        }
      }
      await onSave({
        ...draft, name, headline, location, email,
        kana: draft.kana.trim(), bio: draft.bio.trim(), slack: draft.slack.trim(), skills,
        experience: draft.experience.map((item) => ({ ...item, title: item.title.trim(), description: item.description.trim(), date: item.date.trim() })),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした。もう一度お試しください。");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <form className="editor-form" onSubmit={save} aria-busy={busy}>
      <fieldset className="form-section" disabled={busy}>
        <legend className="label">基本プロフィール</legend>
        <div className="form-grid">
          <div className="form-field"><label className="label" htmlFor={`${id}-name`}>お名前 <span aria-hidden="true">*</span></label><input className="input" id={`${id}-name`} autoComplete="name" value={draft.name} onChange={(event) => update("name", event.target.value)} required maxLength={80} /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-kana`}>ふりがな</label><input className="input" id={`${id}-kana`} value={draft.kana} onChange={(event) => update("kana", event.target.value)} maxLength={100} /></div>
          <div className="form-field full-width"><label className="label" htmlFor={`${id}-headline`}>ひとこと紹介 <span aria-hidden="true">*</span></label><input className="input" id={`${id}-headline`} placeholder="例：デザインと場づくりで、活動を支えたい" value={draft.headline} onChange={(event) => update("headline", event.target.value)} required maxLength={120} /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-location`}>活動エリア <span aria-hidden="true">*</span></label><input className="input" id={`${id}-location`} placeholder="例：東京都 / オンライン" value={draft.location} onChange={(event) => update("location", event.target.value)} required maxLength={100} /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-hours`}>活動できる時間の目安（月）</label><div style={{ display: "flex", alignItems: "center", gap: 8 }}><input className="input" id={`${id}-hours`} type="number" min={0} max={744} step={1} value={draft.hoursPerMonth} onChange={(event) => update("hoursPerMonth", Number(event.target.value))} required /><span className="muted" style={{ whiteSpace: "nowrap" }}>時間</span></div></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-email`}>メールアドレス <span aria-hidden="true">*</span></label><input className="input" id={`${id}-email`} type="email" autoComplete="email" value={draft.email} onChange={(event) => update("email", event.target.value)} required maxLength={254} /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-slack`}>SlackユーザーID</label><input className="input" id={`${id}-slack`} placeholder="例：U0123456789" value={draft.slack} onChange={(event) => update("slack", event.target.value)} maxLength={80} /></div>
          <div className="form-field full-width"><label className="label" htmlFor={`${id}-bio`}>自己PR・活動に参加したい理由</label><textarea className="textarea" id={`${id}-bio`} rows={4} value={draft.bio} onChange={(event) => update("bio", event.target.value)} maxLength={3000} placeholder="得意なことや、活動で大切にしたいことを教えてください。" /></div>
        </div>
      </fieldset>

      <fieldset className="form-section" disabled={busy}>
        <legend className="label">活動への意欲</legend>
        <div className="form-field"><label className="label" htmlFor={`${id}-motivation`}>いまの参加意欲</label><select className="input" id={`${id}-motivation`} value={draft.motivation} onChange={(event) => update("motivation", event.target.value as Supporter["motivation"])} required>{Object.entries(MOTIVATION_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
      </fieldset>
      <fieldset disabled={busy} className="form-section" style={{ padding: 0, border: 0 }}>
        <TagPicker legend="自分で登録するスキル" options={SKILL_OPTIONS} values={selfSkills} onChange={setSelfSkills} allowCustom />
        <fieldset className="form-section"><legend className="label">他のサポーターから推薦されたスキル</legend>{recommendedSkills.length ? <div className="tag-picker">{recommendedSkills.map((skill) => <span className="skill-tag recommended" key={skill.name}>{skill.name}<span>{skill.endorsers.length}人から推薦</span></span>)}</div> : <p className="muted">承認した推薦スキルがここに表示されます。</p>}<p className="muted">推薦情報はここでは編集できません。届いた推薦から承認できます。</p></fieldset>
        <TagPicker legend="興味のある活動" options={INTEREST_OPTIONS} values={draft.interests} onChange={(values) => update("interests", values)} />
        <TagPicker legend="活動できる条件" options={AVAILABILITY_OPTIONS} values={draft.availability} onChange={(values) => update("availability", values)} />
      </fieldset>

      <fieldset className="form-section" disabled={busy}>
        <legend className="label">経験・実績</legend>
        {draft.experience.map((item, index) => (
          <fieldset className="form-section" key={index}>
            <legend className="label">経験 {index + 1}</legend>
            <div className="form-grid">
              <div className="form-field"><label className="label" htmlFor={`${id}-experience-${index}-title`}>タイトル <span aria-hidden="true">*</span></label><input className="input" id={`${id}-experience-${index}-title`} value={item.title} onChange={(event) => updateExperience(index, "title", event.target.value)} required maxLength={120} placeholder="例：地域イベントの運営" /></div>
              <div className="form-field"><label className="label" htmlFor={`${id}-experience-${index}-date`}>時期</label><input className="input" id={`${id}-experience-${index}-date`} type="month" value={item.date} onChange={(event) => updateExperience(index, "date", event.target.value)} /></div>
              <div className="form-field full-width"><label className="label" htmlFor={`${id}-experience-${index}-description`}>取り組んだこと・実績</label><textarea className="textarea" id={`${id}-experience-${index}-description`} rows={3} value={item.description} onChange={(event) => updateExperience(index, "description", event.target.value)} maxLength={2000} /></div>
            </div>
            <button type="button" className="button secondary" style={{ marginTop: 10 }} onClick={() => update("experience", draft.experience.filter((_, itemIndex) => itemIndex !== index))} aria-label={`経験 ${index + 1}を削除`}><Trash2 size={15} aria-hidden="true" />削除</button>
          </fieldset>
        ))}
        <button type="button" className="button secondary" onClick={() => update("experience", [...draft.experience, { title: "", description: "", date: "" }])}><Plus size={16} aria-hidden="true" />経験・実績を追加</button>
      </fieldset>
      <SaveActions busy={busy} error={error} onCancel={onCancel} label="プロフィールを保存" />
    </form>
  );
}

function toDateTimeInput(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return value.slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ActivityEditor({ activity, onSave, onCancel }: {
  activity?: Activity;
  onSave: (activity: Activity) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Activity>(() => activity ? { ...activity, date: toDateTimeInput(activity.date), requiredSkills: [...activity.requiredSkills] } : {
    id: crypto.randomUUID(),
    title: "", description: "", date: "", location: "", recruitment: "", requiredSkills: [], idealPerson: "", headcount: 3, conditions: "", status: "recruiting",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const update = <Key extends keyof Activity>(key: Key, value: Activity[Key]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    if (![draft.title, draft.description, draft.location, draft.recruitment].every((value) => value.trim())) {
      setError("活動名、活動内容、活動場所、募集内容を入力してください。");
      return;
    }
    if (!draft.date || Number.isNaN(new Date(draft.date).getTime())) { setError("活動日時を入力してください。"); return; }
    if (!Number.isInteger(draft.headcount) || draft.headcount < 1 || draft.headcount > 10000) { setError("必要人数は1〜10,000人で入力してください。"); return; }
    if (draft.requiredSkills.length === 0) { setError("必要なスキルを1つ以上選んでください。"); return; }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(), description: draft.description.trim(), location: draft.location.trim(),
        recruitment: draft.recruitment.trim(), idealPerson: draft.idealPerson.trim(), conditions: draft.conditions.trim(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした。もう一度お試しください。");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <form className="editor-form" onSubmit={save} aria-busy={busy}>
      <fieldset className="form-section" disabled={busy}>
        <legend className="label">活動の基本情報</legend>
        <div className="form-grid">
          <div className="form-field full-width"><label className="label" htmlFor={`${id}-title`}>活動名 <span aria-hidden="true">*</span></label><input className="input" id={`${id}-title`} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="例：交流イベントのSNS告知を一緒につくる" required maxLength={120} /></div>
          <div className="form-field full-width"><label className="label" htmlFor={`${id}-description`}>活動内容 <span aria-hidden="true">*</span></label><textarea className="textarea" id={`${id}-description`} rows={4} value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="活動の目的や、取り組みたいことを記入してください。" required maxLength={4000} /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-date`}>活動日時 <span aria-hidden="true">*</span></label><input className="input" id={`${id}-date`} type="datetime-local" value={draft.date} onChange={(event) => update("date", event.target.value)} required /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-location`}>活動場所 <span aria-hidden="true">*</span></label><input className="input" id={`${id}-location`} value={draft.location} onChange={(event) => update("location", event.target.value)} placeholder="例：東京都渋谷区 / オンライン" required maxLength={160} /></div>
        </div>
      </fieldset>
      <fieldset className="form-section" disabled={busy}>
        <legend className="label">募集するサポーター</legend>
        <div className="form-grid">
          <div className="form-field full-width"><label className="label" htmlFor={`${id}-recruitment`}>募集内容 <span aria-hidden="true">*</span></label><textarea className="textarea" id={`${id}-recruitment`} rows={3} value={draft.recruitment} onChange={(event) => update("recruitment", event.target.value)} placeholder="具体的にお願いしたい作業や役割を記入してください。" required maxLength={3000} /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-headcount`}>必要人数 <span aria-hidden="true">*</span></label><input className="input" id={`${id}-headcount`} type="number" min={1} max={10000} step={1} value={draft.headcount} onChange={(event) => update("headcount", Number(event.target.value))} required /></div>
          <div className="form-field"><label className="label" htmlFor={`${id}-status`}>募集状況</label><select className="input" id={`${id}-status`} value={draft.status} onChange={(event) => update("status", event.target.value as Activity["status"])}><option value="recruiting">募集中</option><option value="closed">募集終了</option></select></div>
          <div className="form-field full-width"><label className="label" htmlFor={`${id}-idealPerson`}>求める人物像</label><textarea className="textarea" id={`${id}-idealPerson`} rows={2} value={draft.idealPerson} onChange={(event) => update("idealPerson", event.target.value)} placeholder="例：SNSの発信が好きで、チームで制作を進められる方" maxLength={2000} /></div>
        </div>
      </fieldset>
      <fieldset className="form-section" disabled={busy} style={{ padding: 0, border: 0 }}><TagPicker legend="必要なスキル *" options={SKILL_OPTIONS} values={draft.requiredSkills} onChange={(values) => update("requiredSkills", values)} allowCustom hint="マッチングに使用するスキルを1つ以上選んでください。" /></fieldset>
      <fieldset className="form-section" disabled={busy}>
        <legend className="label">その他の条件</legend>
        <div className="form-field"><label className="label" htmlFor={`${id}-conditions`}>参加にあたっての条件・補足</label><textarea className="textarea" id={`${id}-conditions`} rows={3} value={draft.conditions} onChange={(event) => update("conditions", event.target.value)} placeholder="活動可能な時間、オンライン参加の可否、事前準備など" maxLength={2000} /></div>
      </fieldset>
      <SaveActions busy={busy} error={error} onCancel={onCancel} label={activity ? "活動を保存" : "活動を登録"} />
    </form>
  );
}
