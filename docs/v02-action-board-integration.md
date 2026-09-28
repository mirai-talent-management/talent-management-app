# v0.2 調査結果・アクションボード統合計画

## 1. v0.1の構成

Next.js 15 / React 19 / TypeScript / Tailwind 4、npm。App Routerから単一の `src/App.tsx` を表示し、`src/domain.ts` に型・サンプル・マッチング、`src/components/Editors.tsx` に編集UI、`src/lib/backend.ts` / `supabase.ts` に保存先接続を置く構成。ローカルデモとSupabase接続を切り替える設計でした。

## 2. v0.1の実装済み機能

2ロールのデモ切替、一覧・詳細・検索、プロフィールとスキル編集、推薦承認、活動登録、タグマッチング、メール／Slack向け連絡導線。ドメインテスト9件を維持しています。

## 3. アクションボードとの技術差分

参照対象は公開 `develop` のcommit `1b269081aaee4a145a125af46d5c90b88d9e5a4e`（2026-08-22）。参照用コピーは独立しており、アクションボード本体を変更していません。

| 分野 | v0.1 | アクションボード参照時点 | v0.2方針 |
|---|---|---|---|
| ランタイム | Next 15 / React 19 / npm | Next 16.1.6 / React 19.2 / pnpm 9 | 既存を維持、移植時に揃える |
| UI | Tailwind 4、独自UI | Tailwind 4、shadcn/Radix、CVA、Lucide | クリーム・ミント、角丸、Lucide |
| 機能分割 | App・domainに集約 | features下のactions/loaders/services等 | `src/features/talent/` を追加 |
| Auth | デモ切替、独立Supabase接続 | Supabase SSR cookie / proxy | IdentityAdapterで交換可能に |
| DB | 独立profiles等 | auth.users / public_user_profiles / private_users等 | talent_*を追加 |
| 権限 | 旧版独自 | サーバー認証・認可、admin clientへ移行中、既存RLSも残る | action認可 + 本人限定RLS |
| 開発規約 | tsc / Node test | Biome、Jest、Playwright、kebab-case | 責務と命名から整える |

根拠：[package.json](https://github.com/team-mirai-volunteer/action-board/blob/1b269081aaee4a145a125af46d5c90b88d9e5a4e/package.json)、[アーキテクチャ指針](https://github.com/team-mirai-volunteer/action-board/blob/1b269081aaee4a145a125af46d5c90b88d9e5a4e/docs/nextjs_architecture_guidelines.md)、[AGENTS.md](https://github.com/team-mirai-volunteer/action-board/blob/1b269081aaee4a145a125af46d5c90b88d9e5a4e/AGENTS.md)、[UIトークン](https://github.com/team-mirai-volunteer/action-board/blob/1b269081aaee4a145a125af46d5c90b88d9e5a4e/src/app/globals.css)。本家コードの一括コピーやライセンス変更はしていません。

## 4. 再利用した部分

v0.1のActivity・Supporter型、活動編集フォーム、Lucide、基本プロフィールサンプルを再利用。旧版を `/legacy` に残し、保存先を分離。既存SupabaseテーブルやlocalStorageを書き換えません。

## 5. リファクタリング

新機能をfeatureへ切り出し、画面から抽出・編成ロジックを分離。actionで本人／スタッフを確認し、loaderで公開DTOに投影。非公開データをブラウザへ全件渡して隠す方式は使用しません。

移植時には旧Supporter互換フィールドの縮小、共通UI・フォームへの差し替え、Supabase型生成とrepository実装、共通テスト・formatterへの移行が必要です。Next 16への全面更新は今回行っていません。

## 6. DB変更案

追加migrationは `202609220001_talent_v02.sql`。概念を必要な単位にまとめています。

- talent_memberships：管理者が同期するロール
- talent_profiles / talent_contacts：プロフィールと連絡先の分離。居住地は市区町村だけマイタレント側で保持
- talent_skills / talent_evidence：元表現・正規化名・関連語・source・承認後の公開根拠
- talent_recommendations / talent_suggestions：推薦原文・出典・参照・確信度・承認状態
- talent_interviews：本人限定の会話と再開状態
- talent_activities / talent_teams：活動と候補案

活動可能条件・政策関心・助言できる政策分野はプロフィール内の配列／JSON、助言の立場は本人申告の文章です。将来、taxonomy・外部データソース・活動履歴の専用テーブルを追加可能です。Embeddingは未生成で、モデル・次元・バージョンを持つ索引を承認済みスキルIDへ紐付ける方針です。

本人IDはauth.users.id。本家public_user_profilesにはname/address_prefecture/avatar等があり、private_usersとの重複項目同期は2025-10-25に削除済み。新しい二重同期を仮定しません。本家admin/posting-adminとTalent staffも自動的に同一視せず明示対応します。

居住地の都道府県は `public_user_profiles.address_prefecture` を参照し、マイタレントでは編集させません。市区町村だけを `talent_profiles.municipality` に本人が任意入力します。表示時に両者を組み合わせ、都道府県検索には本家の値を使います。ローカルデモは互換性のため結合済みの `location` を保存しますが、保存APIでは市区町村だけを受け付け、既存の都道府県を維持します。

根拠：[Supabase生成型](https://github.com/team-mirai-volunteer/action-board/blob/1b269081aaee4a145a125af46d5c90b88d9e5a4e/src/lib/types/supabase.ts)、[重複項目削除migration](https://github.com/team-mirai-volunteer/action-board/blob/1b269081aaee4a145a125af46d5c90b88d9e5a4e/supabase/migrations/20251025062103_remove_duplicated_columns_on_private_users.sql)。

## 7. ページ・コンポーネント

| URL | 内容 |
|---|---|
| `/`、`/talent/supporters` | 一覧、タグ／自然文検索、選定理由、詳細ダイアログ |
| `/talent/profile` | 本人プロフィール、柔軟なスキル、充実度、育つアバター |
| `/talent/interview` | 会話、中断・再開 |
| `/talent/suggestions` | 面談・推薦・活動記録由来の候補を本人が確認 |
| `/talent/recommendations` | 自由文推薦 |
| `/talent/activities` | スタッフの活動登録 |
| `/talent/team` | Team Builderと案の確認 |

talent-app.tsxが画面、self-workspace.tsxが本人操作、talent-ui.tsxがカード・バッジ・アバターを担当。アバターはスキルに応じたカメラ・ヘッドホン等のアイコンで、容姿推定ではありません。

## 8. AIアーキテクチャ

UI → API → 認証・入力検証 → action → service → repository。外部AIへの交換入口はTalentAIProvider。候補のJSON Schemaと実行時guardがあります。現在は決定的なMockでSDK・ネットワーク呼出しなし。

抽出、正規化、面談、検索、チーム編成を分離。元表現・出典・根拠と正規化結果を別フィールドに保存。候補はpendingから本人操作だけで承認／却下します。政治思想、健康、障害、家庭・経済事情、ネガティブ評価、意欲の推測に当たる文は抽出から除外。Slack分析は取り下げ、実行経路を設けません。このルール辞書は本番の安全性を保証せず、外部AI接続時は専用評価が必要です。

Team Builderは人数・担当を構造化し、地域・日時・活動可否を確認、重複配置を防止します。相性設定は今回の画面・API・新規DBスキーマ・編成処理には含めません。人間関係への影響と編成結果からの推測リスクを検討する将来案です。

## 9. アクションボード統合方針

1. featureを移植しルート・共通レイアウト・UIへ接続。
2. デモ認証を検証済みSupabase Authへ交換し、staff権限を照合。
3. repositoryを追加テーブルへ接続、RLS・RPCをSupabase環境で検証。
   居住都道府県は本家プロフィールから取得し、マイタレント側の市区町村入力とは別々に扱う。
4. achievementsとmissionsを活動記録adapterへ入力し、ユーザーIDを明示対応。
5. 役割が記録されている場合だけ能力候補にし本人確認へ送る。単なるイベント参加から運営能力を推測しない。
6. 承認済み情報で検索索引を作る。Slack分析は実行権限・費用上限・監査を設計できた段階で再検討する。

admin clientはRLSを迂回するため、action認可・公開DTOを削除しません。「また一緒に活動したい」は本人操作でprefer_togetherを保存する既存契約に接続できます。

## 10. Phase計画

| Phase | 内容 | 状態 |
|---|---|---|
| A | 現行・本家調査と移植方針 | 完了 |
| B | feature・出典・承認・保存・権限 | 実装済み |
| C | 9つのデモ体験 | 実装済み |
| D | 回帰・サービス・権限・HTTP・build確認 | 実施。画面目視はmacOS操作権限不足で未完了 |
| E | Supabase実接続、実ログイン、RLS結合試験 | 今回のデモ外 |
| F | アクションボード組込、外部AI/Embedding接続。Slack分析は費用・権限設計後に別途判断 | 将来 |

## 11. 今回のデモ範囲

9つの画面体験をローカルサンプルで提供。実送信、実Auth、クラウドDB、外部LLM、Embedding、実Slack収集、実アクションボード同期、参加自動確定は今回対象外です。

単体テスト57件、HTTPチェック24項目。型検査・production buildも確認。実データに移る前にはSupabaseでのRLS・トランザクション検証と、ブラウザで保存・承認・再開・端末幅の確認が必要です。
