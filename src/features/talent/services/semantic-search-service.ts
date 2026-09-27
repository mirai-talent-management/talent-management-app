import type { SearchConstraints, SearchResponse, TalentProfile } from '../types.ts'
import { detectSkills } from './skill-normalization-service.ts'

const regions = ['横浜', '川崎', '札幌', '仙台', '名古屋', '神戸', '北九州', 'さいたま', '広島', '福岡', '大阪', '京都', '東京', '神奈川', '千葉', '埼玉', '北海道', '宮城', '愛知', '兵庫', '静岡', '沖縄', '奈良', '岡山', '新潟', '長野', '茨城', '栃木', '群馬', '滋賀', '三重', '岐阜', '山梨', '富山', '石川', '福井', '山形', '秋田', '青森', '岩手', '福島', '和歌山', '鳥取', '島根', '山口', '徳島', '香川', '愛媛', '高知', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島']
const compact = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[\s　]/gu, '')

export function parseSearchConstraints(query: string, policyTopics: string[] = []): SearchConstraints {
  const text = query.normalize('NFKC')
  const policyTopic = [...policyTopics].sort((a,b) => b.length - a.length).find(topic => compact(text).includes(compact(topic))) ?? null
  const policyMode = policyTopic ? /助言|アドバイス|相談|知見/u.test(text) ? 'advice' : /関心|興味|学び/u.test(text) ? 'interest' : null : null
  let day = text.match(/([月火水木金土日])(?:曜(?:日)?)/u)?.[1] ?? text.match(/[（(]([月火水木金土日])[）)]/u)?.[1] ?? null
  const dateParts = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/u) ?? text.match(/(?:(\d{4})[-/])?(\d{1,2})\/(\d{1,2})(?!\d)/u)
  if (!day && dateParts) {
    const year = Number(dateParts[1] ?? new Date().getFullYear()), month = Number(dateParts[2]), date = Number(dateParts[3])
    const requested = new Date(year, month - 1, date)
    if (requested.getMonth() === month - 1 && requested.getDate() === date) day = '日月火水木金土'[requested.getDay()]
  }
  let timeSlot = /午後|昼過ぎ/u.test(text) ? '午後' : /午前|朝/u.test(text) ? '午前' : /夜|夕方/u.test(text) ? '夜' : null
  const hours = text.match(/(\d{1,2})(?::\d{2}|時)?\s*[〜～~–—-]\s*(\d{1,2})(?::\d{2}|時)/u)
  if (hours) {
    const from = Number(hours[1]), to = Number(hours[2])
    if (from >= 6 && to > from && to <= 24) timeSlot = [from < 12 && to > 6 ? '午前' : '', from < 18 && to > 12 ? '午後' : '', to > 18 ? '夜' : ''].filter(Boolean).join('・')
    else timeSlot = '時間帯の個別確認が必要'
  }
  return {
    skills: detectSkills(text).map(skill => skill.normalizedName),
    policyTopic,
    policyMode,
    region: regions.find(region => text.includes(region)) ?? null,
    weekday: day ? `${day}曜日` : null,
    timeSlot,
    mode: /オンライン|リモート|remote/iu.test(text) ? 'remote' : /現地|対面|街頭/u.test(text) ? 'onsite' : null,
  }
}

export function checkAvailability(profile: TalentProfile, constraints: SearchConstraints): { eligible: boolean; confirmations: string[] } {
  const availability = profile.availabilityDetails
  if (profile.participation.includes('resting')) return { eligible: false, confirmations: [] }
  if (constraints.region && !availability.regions.some(region => compact(region).includes(compact(constraints.region!)))) return { eligible: false, confirmations: [] }
  if (constraints.weekday && !availability.weekdays.some(day => compact(day).replace(/曜日?$/u, '') === constraints.weekday![0])) return { eligible: false, confirmations: [] }
  if (constraints.timeSlot && !constraints.timeSlot.split('・').every(slot => availability.timeSlots.includes(slot))) return { eligible: false, confirmations: [] }
  if (constraints.mode === 'remote' && !availability.remote) return { eligible: false, confirmations: [] }
  if (constraints.mode === 'onsite' && !availability.onsite) return { eligible: false, confirmations: [] }
  const confirmations = [
    ...(constraints.region ? [`活動地域「${constraints.region}」は登録条件に一致`] : ['活動地域は個別に確認してください']),
    ...(constraints.weekday ? [`${constraints.weekday}は登録条件に一致`] : ['参加できる曜日を確認してください']),
    ...(constraints.timeSlot ? [`${constraints.timeSlot}は登録条件に一致`] : ['当日の時間帯を確認してください']),
    ...(constraints.mode ? [`${constraints.mode === 'remote' ? 'オンライン' : '現地'}参加の登録あり`] : ['オンライン・現地の参加方法を確認してください']),
    '定例の活動可能条件による照合です。指定日の参加可否は本人に確認してください。',
  ]
  return { eligible: true, confirmations }
}

export function skillMatches(profile: TalentProfile, requested: string): string[] {
  const desired = compact(requested)
  return profile.talents.filter(skill => Boolean(skill.approvedAt) && [skill.normalizedName, ...skill.relatedTerms].some(term => compact(term) === desired)).map(skill => skill.normalizedName)
}

/** Public approved capabilities + explicit availability only. No private-preference parameter exists. */
export function semanticSearch(profiles: TalentProfile[], query: string): SearchResponse {
  const topics = [...new Set(profiles.flatMap(profile => [...profile.policyInterests, ...(profile.policyAdviceTopics ?? [])]))]
  const constraints = parseSearchConstraints(query,topics)
  const unsupported = Boolean(query.trim()) && !constraints.skills.length && !constraints.policyTopic && !constraints.region && !constraints.weekday && !constraints.timeSlot && !constraints.mode
  if (unsupported) return { mode: 'mock', query, constraints, results: [], notice: 'ローカル規則で検索条件を読み取れませんでした。具体的なスキル・政策分野・地域・曜日・時間帯を指定してください。外部AIは利用していません。' }
  const results = profiles.flatMap(profile => {
    const availability = checkAvailability(profile, constraints)
    if (!availability.eligible) return []
    const policyAdvice = constraints.policyTopic && (profile.policyAdviceTopics ?? []).some(topic => compact(topic) === compact(constraints.policyTopic!))
    const policyInterest = constraints.policyTopic && profile.policyInterests.some(topic => compact(topic) === compact(constraints.policyTopic!))
    if (constraints.policyTopic && !(constraints.policyMode === 'advice' ? policyAdvice : constraints.policyMode === 'interest' ? policyInterest : policyAdvice || policyInterest)) return []
    const matchedSkills = [...new Set(constraints.skills.flatMap(skill => skillMatches(profile, skill)))]
    if (constraints.skills.length && !matchedSkills.length) return []
    if (/選挙期間.*積極/u.test(query) && !profile.participation.includes('election_active')) return []
    if (/平時.*(?:参加|活動)/u.test(query) && !profile.participation.includes('regular')) return []
    const matchedRequests = constraints.skills.filter(skill => skillMatches(profile, skill).length > 0).length
    const policyReason = constraints.policyTopic ? [policyAdvice ? `本人申告で「${constraints.policyTopic}」について助言可能` : `本人申告で「${constraints.policyTopic}」に関心あり`] : []
    return [{ profileId: profile.id, score: constraints.skills.length ? Math.round(matchedRequests / constraints.skills.length * 100) : constraints.policyTopic ? 100 : 0,
      matchedSkills, reasons: [...matchedSkills.map(skill => `本人確認済みの「${skill}」が希望する役割と一致`), ...policyReason, ...(!matchedSkills.length && !policyReason.length ? ['登録された活動可能条件が一致'] : [])], confirmations: availability.confirmations }]
  }).sort((a, b) => b.score - a.score || a.profileId.localeCompare(b.profileId, 'ja'))
  return { mode: 'mock', query, constraints, results, notice: 'ローカルの辞書・規則による検索サンプルです。外部AIは利用していません。能力から意欲を推測せず、当日の参加は本人に確認してください。' }
}
