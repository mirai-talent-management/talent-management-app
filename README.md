# talent-management-app

議員・スタッフが企画する活動に協力してほしいサポーターを、スキル・興味・モチベーション・他者推薦をもとに検索し、メールで連絡できる社内向けサービス。

- フロント: Next.js (App Router) + TypeScript + Tailwind CSS
- バックエンド: Supabase (Postgres + Auth + RLS)
- メール送信: Resend
- ホスティング: Vercel

## セットアップ

1. 依存関係のインストール

   ```bash
   npm install
   ```

2. Supabaseプロジェクトを作成し、`.env.local.example` を `.env.local` にコピーして値を埋める

   ```bash
   cp .env.local.example .env.local
   ```

3. DBマイグレーションを適用(Supabase CLIをリンク後)

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

4. 型定義を生成

   ```bash
   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
   ```

5. 開発サーバー起動

   ```bash
   npm run dev
   ```

   [http://localhost:3000](http://localhost:3000) を開く。

## ディレクトリ構成

- `src/app/` — ルーティング(App Router)
- `src/lib/supabase/` — Supabaseクライアント(ブラウザ/サーバー/proxy)
- `src/lib/dal.ts` — 認証・認可を集約するData Access Layer
- `src/lib/matching/` — マッチングスコア計算
- `supabase/migrations/` — DBスキーマ・RLSポリシー
