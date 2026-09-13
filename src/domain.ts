export type Role = 'staff' | 'supporter';
export type Motivation = 'high' | 'medium' | 'low';

export interface Skill {
  name: string;
  source: 'self' | 'recommended';
  /** Supporter IDs; one endorsement per person and skill. */
  endorsers: string[];
}

export interface Supporter {
  id: string;
  name: string;
  kana: string;
  headline: string;
  location: string;
  bio: string;
  skills: Skill[];
  interests: string[];
  motivation: Motivation;
  availability: string[];
  hoursPerMonth: number;
  experience: { title: string; description: string; date: string }[];
  email: string;
  slack: string;
  joinedAt: string;
  color: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  recruitment: string;
  requiredSkills: string[];
  idealPerson: string;
  headcount: number;
  conditions: string;
  status: 'recruiting' | 'closed';
}

export interface Recommendation {
  id: string;
  fromId: string;
  toId: string;
  skill: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const SKILL_OPTIONS = [
  'SNS', 'Instagram', '動画編集', '広報', 'イベント運営', '写真撮影',
  'グラフィックデザイン', 'ライティング', 'Webデザイン', 'エンジニアリング',
  'データ分析', 'リサーチ', '司会・進行', 'プロジェクト管理', '翻訳',
  'イラスト', '会計', '地域連携', '受付・案内', '配信',
];

export const INTEREST_OPTIONS = [
  'イベント', '広報・発信', 'テクノロジー', '地域活動', '教育',
  '子育て', '政策づくり', 'コミュニティ', 'アクセシビリティ', '環境',
];

export const AVAILABILITY_OPTIONS = [
  '平日昼', '平日夜', '土日祝', 'オンライン', '現地参加',
];

export const MOTIVATION_LABELS: Record<Motivation, string> = {
  high: '積極的に参加したい',
  medium: '予定が合えば参加したい',
  low: 'まずは少しずつ参加したい',
};

const self = (...names: string[]): Skill[] => names.map((name) => ({ name, source: 'self', endorsers: [] }));
const recommended = (name: string, ...endorsers: string[]): Skill => ({ name, source: 'recommended', endorsers });

/** Entirely fictional demonstration profiles. Contact details are placeholders. */
export const initialSupporters: Supporter[] = [
  {
    id: 's1', name: '田中 美咲', kana: 'たなか みさき', headline: '伝わる発信で、活動の輪を広げたい',
    location: '東京都', bio: '日々の仕事ではブランドのSNS運用を担当しています。初めての方にも活動の楽しさが伝わるよう、企画から撮影・発信までお手伝いできます。週末のイベントにも参加したいです。',
    skills: [...self('SNS', 'Instagram', '広報'), recommended('動画編集', 's2', 's3', 's4')],
    interests: ['広報・発信', 'イベント', '教育'], motivation: 'high', availability: ['平日夜', '土日祝', 'オンライン', '現地参加'], hoursPerMonth: 20,
    experience: [
      { title: '地域交流イベントのSNS広報', description: '告知投稿と当日のリール動画を制作。チームで投稿カレンダーを管理しました。', date: '2026-08' },
      { title: '市民ワークショップの記録映像', description: '参加者のインタビュー撮影から、3分のダイジェスト編集まで担当しました。', date: '2026-06' },
    ], email: 'misaki.tanaka@example.com', slack: 'misaki.tanaka', joinedAt: '2026-04-15', color: '#9B8EBF',
  },
  {
    id: 's2', name: '佐藤 健太', kana: 'さとう けんた', headline: 'SNSと写真で、現場の空気を届けます',
    location: '神奈川県', bio: '写真を撮ることと、人の話を聞くことが好きです。地域の取り組みをSNSで紹介しています。仕事の合間に、無理なく継続して協力したいです。',
    skills: [...self('SNS', 'Instagram', '写真撮影'), recommended('ライティング', 's1')], interests: ['広報・発信', '地域活動'], motivation: 'medium', availability: ['土日祝', 'オンライン', '現地参加'], hoursPerMonth: 10,
    experience: [{ title: '地域マルシェの撮影・Instagram発信', description: '出店者紹介の写真と記事を制作し、イベント当日の撮影を担当しました。', date: '2026-07' }],
    email: 'kenta.sato@example.com', slack: 'kenta.sato', joinedAt: '2026-05-02', color: '#83A9B7',
  },
  {
    id: 's3', name: '鈴木 遥', kana: 'すずき はるか', headline: 'アイデアを、伝わるデザインに',
    location: '東京都', bio: 'フリーランスのデザイナーです。紙のチラシからWebサイトまで、読み手に合わせた情報整理を大切にしています。',
    skills: [...self('グラフィックデザイン', 'Webデザイン', '広報'), recommended('Instagram', 's1', 's6')], interests: ['広報・発信', 'テクノロジー', 'アクセシビリティ'], motivation: 'high', availability: ['平日昼', '平日夜', 'オンライン'], hoursPerMonth: 24,
    experience: [{ title: '市民勉強会の広報デザイン', description: '告知バナー、チラシ、申込ページを制作。読みやすさと情報の優先順位を整理しました。', date: '2026-08' }],
    email: 'haruka.suzuki@example.com', slack: 'haruka.suzuki', joinedAt: '2026-03-20', color: '#D3A58C',
  },
  {
    id: 's4', name: '高橋 翔太', kana: 'たかはし しょうた', headline: '動画と配信なら、お任せください',
    location: '千葉県', bio: '映像制作会社で編集を担当しています。短い動画でもメッセージが伝わる構成を考えるのが得意です。配信の機材準備もできます。',
    skills: [...self('動画編集', '配信', 'SNS'), recommended('イベント運営', 's1', 's8')], interests: ['広報・発信', 'イベント', 'テクノロジー'], motivation: 'high', availability: ['平日夜', '土日祝', 'オンライン', '現地参加'], hoursPerMonth: 16,
    experience: [{ title: '公開トークイベントのライブ配信', description: '音声・映像の確認、配信操作、アーカイブ動画の字幕編集を担当しました。', date: '2026-08' }],
    email: 'shota.takahashi@example.com', slack: 'shota.takahashi', joinedAt: '2026-04-01', color: '#7BA59A',
  },
  {
    id: 's5', name: '伊藤 彩', kana: 'いとう あや', headline: '初めての参加者にも、居心地のよい場を',
    location: '埼玉県', bio: '人と人をつなぐイベント運営に関わってきました。参加者の目線で準備し、安心して話せる場をつくりたいです。',
    skills: [...self('イベント運営', '受付・案内', '地域連携'), recommended('司会・進行', 's8', 's11')], interests: ['イベント', '地域活動', 'コミュニティ'], motivation: 'high', availability: ['土日祝', '現地参加'], hoursPerMonth: 16,
    experience: [{ title: '地域コミュニティ交流会の運営', description: '受付導線とボランティアのシフトを設計し、当日の進行を支えました。', date: '2026-07' }],
    email: 'aya.ito@example.com', slack: 'aya.ito', joinedAt: '2026-04-18', color: '#C195A5',
  },
  {
    id: 's6', name: '渡辺 蓮', kana: 'わたなべ れん', headline: '小さな仕組みで、活動をもっと便利に',
    location: '東京都', bio: 'Webアプリを作るエンジニアです。活動の手間を減らすツールや、誰もが使いやすいサービスづくりに興味があります。',
    skills: [...self('エンジニアリング', 'Webデザイン', 'データ分析'), recommended('プロジェクト管理', 's3')], interests: ['テクノロジー', 'アクセシビリティ', '政策づくり'], motivation: 'high', availability: ['平日夜', 'オンライン'], hoursPerMonth: 24,
    experience: [{ title: 'ボランティア向け参加受付フォーム', description: '申込フォームと集計画面を制作し、運営チームへの引き継ぎまで行いました。', date: '2026-06' }],
    email: 'ren.watanabe@example.com', slack: 'ren.watanabe', joinedAt: '2026-02-12', color: '#8B9FC0',
  },
  {
    id: 's7', name: '山本 菜月', kana: 'やまもと なつき', headline: '複雑なことを、わかりやすい言葉で',
    location: '大阪府', bio: '編集者としてインタビューや記事制作をしています。相手の思いを聞き取り、読み手に届く文章にまとめることが得意です。',
    skills: [...self('ライティング', 'リサーチ', '広報'), recommended('SNS', 's2', 's9')], interests: ['広報・発信', '教育', '政策づくり'], motivation: 'medium', availability: ['平日夜', 'オンライン'], hoursPerMonth: 12,
    experience: [{ title: '地域活動インタビュー記事の編集', description: '活動メンバーへの取材、原稿編集、掲載前の事実確認を担当しました。', date: '2026-08' }],
    email: 'natsuki.yamamoto@example.com', slack: 'natsuki.yamamoto', joinedAt: '2026-05-10', color: '#B79B70',
  },
  {
    id: 's8', name: '中村 大地', kana: 'なかむら だいち', headline: 'チームで動く準備と段取りが得意です',
    location: '東京都', bio: '仕事ではプロジェクトの進行管理をしています。一人ひとりが力を発揮できるよう、役割分担とこまめな共有を大切にします。',
    skills: [...self('プロジェクト管理', 'イベント運営', '司会・進行'), recommended('地域連携', 's5', 's11')], interests: ['イベント', 'コミュニティ', '地域活動'], motivation: 'high', availability: ['平日夜', '土日祝', 'オンライン', '現地参加'], hoursPerMonth: 20,
    experience: [{ title: 'まちづくりワークショップの企画運営', description: '会場調整、当日の進行表作成、スタッフへの事前説明を担当しました。', date: '2026-08' }],
    email: 'daichi.nakamura@example.com', slack: 'daichi.nakamura', joinedAt: '2026-03-09', color: '#8EA89B',
  },
  {
    id: 's9', name: '小林 結衣', kana: 'こばやし ゆい', headline: 'データから、次の一歩を見つけたい',
    location: '京都府', bio: '調査会社でアンケートの集計・分析をしています。参加者の声を丁寧に整理し、改善につながる発見をお手伝いします。',
    skills: [...self('データ分析', 'リサーチ', 'ライティング')], interests: ['政策づくり', '教育', 'テクノロジー'], motivation: 'medium', availability: ['土日祝', 'オンライン'], hoursPerMonth: 8,
    experience: [{ title: '市民アンケートの集計支援', description: '回答の整理とグラフ作成、自由記述の分類を担当しました。', date: '2026-05' }],
    email: 'yui.kobayashi@example.com', slack: 'yui.kobayashi', joinedAt: '2026-06-01', color: '#A49DBE',
  },
  {
    id: 's10', name: '加藤 悠真', kana: 'かとう ゆうま', headline: 'やさしいイラストで、伝わるきっかけを',
    location: '愛知県', bio: 'イラストを描くことが好きな会社員です。図解や短い動画づくりに挑戦中で、まずは小さな制作から関わりたいです。',
    skills: [...self('イラスト', 'グラフィックデザイン', '動画編集')], interests: ['広報・発信', '子育て', '教育'], motivation: 'low', availability: ['土日祝', 'オンライン'], hoursPerMonth: 4,
    experience: [{ title: '子ども向け体験会の案内イラスト', description: '持ち物や当日の流れを伝えるイラストを制作しました。', date: '2026-07' }],
    email: 'yuma.kato@example.com', slack: 'yuma.kato', joinedAt: '2026-08-20', color: '#CEAA76',
  },
  {
    id: 's11', name: '吉田 真由', kana: 'よしだ まゆ', headline: '地域のつながりを、活動の力に',
    location: '福岡県', bio: '地域の居場所づくりに関わっています。住民の方との調整や、初めて参加する方へのご案内をお手伝いできます。',
    skills: [...self('地域連携', 'イベント運営', '受付・案内'), recommended('プロジェクト管理', 's5')], interests: ['地域活動', '子育て', 'コミュニティ'], motivation: 'high', availability: ['平日昼', '土日祝', '現地参加'], hoursPerMonth: 20,
    experience: [{ title: '地域の居場所づくり交流会', description: '会場の調整、地域団体への案内、当日の受付を担当しました。', date: '2026-08' }],
    email: 'mayu.yoshida@example.com', slack: 'mayu.yoshida', joinedAt: '2026-03-24', color: '#BA9F8A',
  },
  {
    id: 's12', name: '山田 航', kana: 'やまだ わたる', headline: '伝えたいことを、言葉の壁を越えて',
    location: '神奈川県', bio: '英語での案内文や字幕の翻訳をしています。さまざまな背景の方が参加しやすい情報発信に関わりたいです。',
    skills: [...self('翻訳', 'ライティング', '動画編集'), recommended('広報', 's7')], interests: ['アクセシビリティ', '広報・発信', 'コミュニティ'], motivation: 'medium', availability: ['平日夜', 'オンライン'], hoursPerMonth: 10,
    experience: [{ title: '交流イベントの英語案内作成', description: 'イベント概要と会場案内を翻訳し、動画の英語字幕も制作しました。', date: '2026-06' }],
    email: 'wataru.yamada@example.com', slack: 'wataru.yamada', joinedAt: '2026-05-18', color: '#7FA7AC',
  },
  {
    id: 's13', name: '松本 千尋', kana: 'まつもと ちひろ', headline: 'お金と事務を整理して、活動を支える',
    location: '兵庫県', bio: '経理の経験を活かして、イベントの予算整理や事務作業をサポートしたいです。オンライン中心で参加できます。',
    skills: [...self('会計', 'プロジェクト管理', 'データ分析')], interests: ['コミュニティ', '地域活動'], motivation: 'medium', availability: ['平日夜', 'オンライン'], hoursPerMonth: 8,
    experience: [{ title: '地域サークルの会計サポート', description: '領収書整理、収支表作成、運営メンバーへの月次共有を担当しました。', date: '2026-07' }],
    email: 'chihiro.matsumoto@example.com', slack: 'chihiro.matsumoto', joinedAt: '2026-06-12', color: '#B699AD',
  },
  {
    id: 's14', name: '井上 颯', kana: 'いのうえ はやて', headline: '現場で動いて、活動を盛り上げたい',
    location: '東京都', bio: '大学でイベントサークルに所属しています。会場設営や受付、SNSの投稿など、できることから積極的に手伝いたいです。',
    skills: [...self('イベント運営', '受付・案内', 'Instagram', 'SNS')], interests: ['イベント', '教育', 'テクノロジー'], motivation: 'high', availability: ['平日夜', '土日祝', '現地参加'], hoursPerMonth: 16,
    experience: [{ title: '大学交流イベントの受付・告知', description: '申込確認と会場案内、Instagramでの告知投稿を担当しました。', date: '2026-07' }],
    email: 'hayate.inoue@example.com', slack: 'hayate.inoue', joinedAt: '2026-08-01', color: '#91A4BF',
  },
  {
    id: 's15', name: '木村 美月', kana: 'きむら みづき', headline: '参加する人の声を、丁寧に拾います',
    location: '北海道', bio: 'ワークショップの進行や聞き取り調査をしています。オンラインでも、安心して意見を話せる時間をつくりたいです。',
    skills: [...self('司会・進行', 'リサーチ', 'ライティング'), recommended('イベント運営', 's8', 's9')], interests: ['政策づくり', '教育', '環境'], motivation: 'medium', availability: ['土日祝', 'オンライン'], hoursPerMonth: 10,
    experience: [{ title: 'オンライン対話会の進行', description: '議題整理、少人数での対話の進行、終了後の意見整理を担当しました。', date: '2026-08' }],
    email: 'mizuki.kimura@example.com', slack: 'mizuki.kimura', joinedAt: '2026-04-28', color: '#9CAE8D',
  },
  {
    id: 's16', name: '林 智也', kana: 'はやし ともや', headline: '使いやすいWebと、わかりやすい資料を',
    location: '宮城県', bio: 'Webサイトの制作と運用をしています。情報の更新をしやすくする仕組みや、活動紹介ページの改善に関心があります。',
    skills: [...self('エンジニアリング', 'Webデザイン', '広報'), recommended('データ分析', 's6')], interests: ['テクノロジー', '広報・発信', '地域活動'], motivation: 'high', availability: ['平日夜', '土日祝', 'オンライン'], hoursPerMonth: 20,
    experience: [{ title: '地域団体の活動紹介サイト制作', description: '活動記事を更新できるWebサイトを制作し、運用方法を説明しました。', date: '2026-06' }],
    email: 'tomoya.hayashi@example.com', slack: 'tomoya.hayashi', joinedAt: '2026-04-06', color: '#B59E86',
  },
  {
    id: 's17', name: '清水 咲良', kana: 'しみず さくら', headline: '身近な視点から、活動を発信したい',
    location: '静岡県', bio: '日常の気づきをInstagramで発信しています。ボランティアは初めてですが、投稿づくりやオンライン作業から少しずつ関わりたいです。',
    skills: [...self('Instagram', 'SNS', '写真撮影')], interests: ['子育て', '教育', '広報・発信'], motivation: 'low', availability: ['平日昼', 'オンライン'], hoursPerMonth: 4,
    experience: [], email: 'sakura.shimizu@example.com', slack: 'sakura.shimizu', joinedAt: '2026-09-01', color: '#C79999',
  },
  {
    id: 's18', name: '森 直樹', kana: 'もり なおき', headline: '地域の声を聞いて、次の企画につなげる',
    location: '広島県', bio: '地域イベントの運営とリサーチに関わってきました。幅広い年代の方の話を聞き、活動の改善に活かしたいと考えています。',
    skills: [...self('地域連携', 'リサーチ', 'イベント運営'), recommended('写真撮影', 's2')], interests: ['地域活動', '環境', '政策づくり'], motivation: 'medium', availability: ['土日祝', '現地参加', 'オンライン'], hoursPerMonth: 12,
    experience: [{ title: '地域の声を聞くワークショップ', description: '参加者への案内と当日の運営、聞き取った意見の分類を担当しました。', date: '2026-07' }],
    email: 'naoki.mori@example.com', slack: 'naoki.mori', joinedAt: '2026-05-26', color: '#8BADA3',
  },
];

export const initialActivities: Activity[] = [
  {
    id: 'a1', title: 'Instagramで、対話イベントの魅力を届けよう',
    description: '10月の対話イベントに向けたSNS告知を一緒につくります。企画のアイデア出しから、Instagramの画像投稿・リール制作、当日の発信まで参加いただけます。',
    date: '2026-10-10T14:00', location: '東京都・オンライン', recruitment: '投稿企画、告知画像・リール動画の制作、Instagramでの発信をお手伝いしてくださる方。',
    requiredSkills: ['SNS', 'Instagram', '動画編集', '広報'], idealPerson: '見る人の立場で考え、チームでアイデアを持ち寄れる方。', headcount: 4,
    conditions: '事前打ち合わせはオンライン。制作のみの参加も歓迎します。', status: 'recruiting',
  },
  {
    id: 'a2', title: 'みんなでつくる、地域の対話ワークショップ',
    description: '地域で暮らす方と、これからの暮らしについて話すワークショップを開催します。初めての方も参加しやすい会場づくりを一緒に進めます。',
    date: '2026-10-18T13:00', location: '東京都・渋谷区', recruitment: '会場設営、受付・案内、テーブル進行、地域の方へのご案内。',
    requiredSkills: ['イベント運営', '地域連携', '受付・案内', '司会・進行'], idealPerson: 'さまざまな意見に耳を傾け、参加者が安心できる場をつくれる方。', headcount: 8,
    conditions: '当日は12時集合。事前説明会にオンラインで参加できる方。', status: 'recruiting',
  },
  {
    id: 'a3', title: '活動をもっと便利にする、小さなツールづくり',
    description: 'ボランティア運営で感じる小さな不便を集め、使いやすいツールの試作につなげます。聞き取りやデザインからの参加も歓迎します。',
    date: '2026-10-24T10:00', location: 'オンライン', recruitment: '運営メンバーへの聞き取り、画面設計、Webツールの試作、データ整理。',
    requiredSkills: ['エンジニアリング', 'Webデザイン', 'データ分析', 'リサーチ'], idealPerson: '利用する人の困りごとを理解し、小さく試しながら改善したい方。', headcount: 5,
    conditions: 'オンライン開催。週2時間程度から、ご自身のペースで参加できます。', status: 'recruiting',
  },
];

export const initialRecommendations: Recommendation[] = [
  { id: 'r1', fromId: 's3', toId: 's1', skill: 'グラフィックデザイン', message: '前回の告知バナーがとてもわかりやすかったです。情報を整理するデザインも美咲さんの強みだと思います！', status: 'pending', createdAt: '2026-09-11' },
  { id: 'r2', fromId: 's8', toId: 's1', skill: 'イベント運営', message: '当日の段取りと参加者への声かけがスムーズでした。運営でも頼れる存在です。', status: 'pending', createdAt: '2026-09-12' },
  { id: 'r3', fromId: 's2', toId: 's1', skill: '動画編集', message: '対話会のダイジェストを、話の流れが伝わる動画に仕上げてくれました。', status: 'approved', createdAt: '2026-08-24' },
  { id: 'r4', fromId: 's3', toId: 's1', skill: '動画編集', message: '字幕やテンポが工夫されていて、初めて見る方にも伝わる動画でした。', status: 'approved', createdAt: '2026-08-25' },
  { id: 'r5', fromId: 's4', toId: 's1', skill: '動画編集', message: '素材整理から編集まで、安心してお願いできました。', status: 'approved', createdAt: '2026-08-26' },
  { id: 'r6', fromId: 's1', toId: 's2', skill: 'ライティング', message: '参加者の声を丁寧に拾った紹介記事が印象的でした。', status: 'approved', createdAt: '2026-08-28' },
  { id: 'r7', fromId: 's1', toId: 's14', skill: '広報', message: 'イベント告知の文章と投稿の工夫がすてきでした。', status: 'pending', createdAt: '2026-09-10' },
];

export interface MatchResult {
  score: number;
  skillScore: number;
  motivationScore: number;
  recommendationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

const skillKey = (value: string) => value.trim().toLocaleLowerCase('en-US');

/** Only approved skills present on the profile contribute to matching. */
export function matchSupporter(person: Supporter, requiredSkills: string[]): MatchResult {
  const required = [...new Map(requiredSkills.filter((name) => name.trim()).map((name) => [skillKey(name), name.trim()])).values()];
  const personSkills = new Set(person.skills.map((skill) => skillKey(skill.name)));
  const matchedSkills = required.filter((name) => personSkills.has(skillKey(name)));
  const missingSkills = required.filter((name) => !personSkills.has(skillKey(name)));
  const skillScore = required.length ? Math.round((matchedSkills.length / required.length) * 70) : 0;
  const motivationScore = { high: 20, medium: 12, low: 5 }[person.motivation];
  const requiredKeys = new Set(required.map(skillKey));
  const endorsements = new Set<string>();
  for (const skill of person.skills) {
    const key = skillKey(skill.name);
    if (required.length && !requiredKeys.has(key)) continue;
    for (const endorser of skill.endorsers) {
      if (endorser !== person.id) endorsements.add(`${key}:${endorser}`);
    }
  }
  const recommendationScore = Math.min(10, endorsements.size * 2);
  return { score: skillScore + motivationScore + recommendationScore, skillScore, motivationScore, recommendationScore, matchedSkills, missingSkills };
}

/** Apply an approval immutably; the caller also updates the recommendation status. */
export function recommendSkillApproval(supporters: Supporter[], recommendation: Recommendation): Supporter[] {
  const name = recommendation.skill.trim();
  if (!name || recommendation.status === 'rejected' || recommendation.fromId === recommendation.toId) return supporters;
  if (!supporters.some((person) => person.id === recommendation.fromId)) return supporters;
  const target = supporters.find((person) => person.id === recommendation.toId);
  if (!target) return supporters;
  const existing = target.skills.find((skill) => skillKey(skill.name) === skillKey(name));
  if (existing?.endorsers.includes(recommendation.fromId)) return supporters;

  return supporters.map((person) => {
    if (person.id !== recommendation.toId) return person;
    const skills: Skill[] = existing
      ? person.skills.map((skill) => skill === existing ? { ...skill, endorsers: [...skill.endorsers, recommendation.fromId] } : skill)
      : [...person.skills, { name, source: 'recommended', endorsers: [recommendation.fromId] }];
    return { ...person, skills };
  });
}
