import type { SkillCategory } from '../types.ts'

export interface NormalizedSkill { normalizedName: string; relatedTerms: string[]; category: SkillCategory }
interface SkillDefinition extends NormalizedSkill { pattern: RegExp }

/** Local dictionary only. This is not an embedding model or an external AI call. */
export const SKILL_DICTIONARY: SkillDefinition[] = [
  { normalizedName: '写真撮影', relatedTerms: ['写真', '撮影', 'カメラ', '一眼レフ', 'ポートレート'], category: 'personal', pattern: /写真|撮影|カメラ|一眼|ポートレート/iu },
  { normalizedName: '音響対応', relatedTerms: ['音響', 'PA', 'マイク', 'ミキサー', 'スピーカー'], category: 'professional', pattern: /音響|\bPA\b|マイク|ミキサー|スピーカー/iu },
  { normalizedName: 'ハガシ', relatedTerms: ['はがし', '時間管理', '話者交代', '演説の交代案内'], category: 'election', pattern: /ハガシ|はがし|話者交代|演説の交代/iu },
  { normalizedName: 'ビラ配り', relatedTerms: ['チラシ配布', 'ビラ', 'チラシ配り', 'フライヤー配布'], category: 'election', pattern: /ビラ|チラシ配|フライヤー配/iu },
  { normalizedName: 'ポスター貼り', relatedTerms: ['ポスター掲示', 'ポスター貼付', '掲示作業'], category: 'election', pattern: /ポスター貼り|ポスター掲示|ポスター貼付|掲示作業/iu },
  { normalizedName: '初参加者フォロー', relatedTerms: ['初参加フォロー', '新人案内', '初めての方への案内', 'オンボーディング'], category: 'community', pattern: /初参加|初めての方|新人案内|オンボーディング/iu },
  { normalizedName: '動画編集', relatedTerms: ['動画', '映像編集', 'Premiere', 'DaVinci', 'リール'], category: 'professional', pattern: /動画|映像編集|Premiere|DaVinci|リール/iu },
  { normalizedName: 'SNS運用', relatedTerms: ['SNS', 'Instagram', 'インスタ', '広報発信'], category: 'professional', pattern: /SNS|Instagram|インスタ|広報発信/iu },
  { normalizedName: 'イベント運営', relatedTerms: ['イベント運営', 'イベント企画', '設営', '会場運営'], category: 'community', pattern: /イベント運営|イベント企画|設営|会場運営/iu },
  { normalizedName: '受付・案内', relatedTerms: ['受付', '会場案内', '案内係'], category: 'community', pattern: /受付|会場案内|案内係/iu },
  { normalizedName: '司会・進行', relatedTerms: ['司会', '進行', 'ファシリテーション'], category: 'community', pattern: /司会|進行|ファシリテ/iu },
  { normalizedName: 'ライティング', relatedTerms: ['文章', '記事', '編集', 'ライター', '取材'], category: 'professional', pattern: /文章|記事|ライタ|取材|ライティング/iu },
  { normalizedName: 'グラフィックデザイン', relatedTerms: ['デザイン', 'バナー', 'チラシ制作', 'Figma', 'Canva'], category: 'professional', pattern: /デザイン|バナー|チラシ制作|Figma|Canva/iu },
  { normalizedName: 'Web開発', relatedTerms: ['エンジニアリング', 'プログラミング', 'Web開発', 'React', 'Python'], category: 'professional', pattern: /エンジニア|プログラミング|Web開発|React|Python/iu },
  { normalizedName: 'データ分析', relatedTerms: ['データ分析', '集計', 'Excel', '統計'], category: 'professional', pattern: /データ分析|集計|Excel|統計/iu },
  { normalizedName: 'リサーチ', relatedTerms: ['リサーチ', '調査', '資料整理'], category: 'professional', pattern: /リサーチ|調査|資料整理/iu },
  { normalizedName: '翻訳', relatedTerms: ['翻訳', '通訳', '英語'], category: 'professional', pattern: /翻訳|通訳|英語/iu },
  { normalizedName: '会計', relatedTerms: ['会計', '経理', '簿記', '税理士'], category: 'professional', pattern: /会計|経理|簿記|税理士/iu },
  { normalizedName: '対話・傾聴', relatedTerms: ['傾聴', '聞き役', '話を聞く', '人と話す', '営業', '接客'], category: 'strength', pattern: /傾聴|聞き役|話を聞く|人と話す|営業|接客/iu },
  { normalizedName: '子どもへの対応', relatedTerms: ['子供への対応', '子ども対応', '子供対応', '子どもとのコミュニケーション'], category: 'strength', pattern: /子(?:ども|供)(?:への|の)?対応|子(?:ども|供)とのコミュニケーション/iu },
  { normalizedName: '調整・橋渡し', relatedTerms: ['調整役', '橋渡し', '意見の整理', '関係者調整'], category: 'strength', pattern: /調整役|橋渡し|意見の整理|関係者調整/iu },
  { normalizedName: '場を和ませる', relatedTerms: ['朗らか', '親しみやすい', '雰囲気づくり', '笑顔での対応'], category: 'strength', pattern: /場を和ませ|朗らか|親しみやす|雰囲気づくり|笑顔で(?:の)?対応/iu },
  { normalizedName: '地域連携', relatedTerms: ['地域連携', '地域団体', '町内会'], category: 'community', pattern: /地域連携|地域団体|町内会/iu },
  { normalizedName: '配信', relatedTerms: ['配信', 'ライブ配信', 'OBS'], category: 'professional', pattern: /配信|OBS/iu },
  { normalizedName: 'プロジェクト管理', relatedTerms: ['プロジェクト管理', '段取り', '進捗管理'], category: 'professional', pattern: /プロジェクト管理|段取り|進捗管理/iu },
  { normalizedName: 'イラスト', relatedTerms: ['イラスト', '絵を描く', '図解'], category: 'personal', pattern: /イラスト|絵を描く|図解/iu },
]

export function normalizeSkill(text: string): NormalizedSkill {
  const clean = text.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  const definition = SKILL_DICTIONARY.find(skill => skill.normalizedName.toLocaleLowerCase() === clean.toLocaleLowerCase())
    ?? SKILL_DICTIONARY.find(skill => skill.pattern.test(clean))
  return definition ? { normalizedName: definition.normalizedName, relatedTerms: [...definition.relatedTerms], category: definition.category }
    : { normalizedName: clean.slice(0, 80), relatedTerms: [], category: 'personal' }
}

export function detectSkills(text: string): NormalizedSkill[] {
  return SKILL_DICTIONARY.filter(skill => skill.pattern.test(text.normalize('NFKC'))).map(({ normalizedName, relatedTerms, category }) => ({ normalizedName, relatedTerms: [...relatedTerms], category }))
}
