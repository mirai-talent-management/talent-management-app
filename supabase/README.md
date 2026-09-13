# Supabase 接続

サンプルデモはブラウザ内のデータで動作します。このディレクトリには、実ユーザーで試すための Supabase Auth・Postgres・アクセス制御を用意しています。クラウドプロジェクトの作成やデプロイは行っていません。

## 初期設定

1. Supabase のプロジェクトを作成し、SQL Editor で `migrations/202609130001_initial.sql` 全体を一度実行します。新しいスキーマを前提としたマイグレーションです。
2. プロジェクトの URL と publishable key を取得し、リポジトリ直下の `.env.local` に設定します。

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

   旧形式の anon key を使う場合は `NEXT_PUBLIC_SUPABASE_ANON_KEY` でも接続できます。service role key・secret key はブラウザ向け環境変数に入れないでください。

3. `npm run dev` を再起動します。環境変数は Next.js のビルド時にも必要です。
4. アプリのサインアップでアカウントを作成します。メール確認が有効なプロジェクトでは、確認メールのリンクから認証を完了してログインします。Auth の URL Configuration には利用するローカル URL／公開 URL を登録します。
5. 初期ロールは全員 `supporter` です。スタッフ用アカウントは作成後に、管理者が SQL Editor で次を実行します。一般ユーザーはロール変更できません。

   ```sql
   update public.profiles
   set role = 'staff'
   where id = (select id from auth.users where email = 'staff@example.com');
   ```

サンプルの架空人物は Supabase へ自動転送されません。接続後のプロフィールは Auth に登録した本人のアカウントにひも付きます。複数のテスト用サポーターとスタッフを作成すると、推薦・承認・検索・活動登録を確認できます。

## データと権限

| テーブル | 内容 | 閲覧可能な利用者 |
|---|---|---|
| `profiles` | 表示名、自己PR、関心、稼働条件、ロール | ログイン済み利用者 |
| `profile_contacts` | 連絡用メール、Slack | 本人と議員・スタッフ |
| `skills` / `supporter_skills` | スキル辞書と本人登録スキル | ログイン済み利用者 |
| `supporter_experiences` | 活動経験・実績 | ログイン済み利用者 |
| `activities` / `activity_skills` | 活動と必要スキル | ログイン済み利用者 |
| `recommendations` | スキル推薦と確認状態 | 承認済みはログイン済み利用者。未承認・辞退は当事者とスタッフ |

全テーブルで RLS を有効化しています。匿名閲覧とブラウザからのテーブルへの直接書き込みは許可せず、認証と所有権を確認する専用 RPC に更新を集約しています。ロールは signup metadata やプロフィール編集から変更できません。

- `save_supporter_profile(jsonb)`：本人のプロフィール・連絡先・本人登録スキル・経験をまとめて保存。クライアントが送る推薦元や推薦人数を信用せず、承認済みの推薦はそのまま保持します。
- `save_activity(jsonb)`：議員・スタッフのみ活動と必要スキルを保存。スタッフ間で既存活動を共同編集できます。
- `submit_recommendation(uuid, uuid, text, text)`：ログイン中のサポーターを推薦元として確定し、他のサポーターへ推薦。自己推薦と同一人物による同一スキルの重複推薦を拒否します。
- `review_recommendation(uuid, boolean)`：推薦先本人のみ承認・辞退。行をロックして処理し、同一操作の再送で件数が増えません。確認済みの推薦を逆の状態へ変えることはできません。

本人登録スキルと承認済み推薦は別のレコードとして保持します。画面向けに集約するとき、本人登録もあるスキルは `source: 'self'` を維持し、推薦元の ID を `endorsers` に付与します。本人登録のない承認済みスキルは `source: 'recommended'` になります。未承認・辞退した推薦はスキルやランキングに含めません。

連絡用メールアドレスの編集は Auth のログインアドレスを変更しません。メール／Slack の連絡画面は文面作成と外部アプリへの引き継ぎです。メール送信 API や Slack OAuth はこの MVP に含みません。

## 実プロジェクトでの確認項目

認証済みサポーター2名とスタッフ1名で確認してください。

1. 未ログインでは各テーブルを読めず、サポーターは他人の連絡先を取得できない。
2. サポーターは他人のプロフィール、ロール、活動を更新できない。
3. 他者からの推薦は本人が承認するまでスキルに現れず、承認後は推薦元が1名増える。
4. 同じ承認の再送で人数が増えず、他人の推薦確認と自己推薦が拒否される。
5. 本人登録済みスキルへの推薦を承認しても、本人登録という由来が保持される。
6. スタッフは活動を作成でき、サポーターの連絡先を取得できる。

参考：[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Auth とユーザーデータ](https://supabase.com/docs/guides/auth/managing-user-data)、[Database Functions](https://supabase.com/docs/guides/database/functions)。
