# v0.2 データと権限

## 現在動く範囲

v0.2 はサーバー側で動くローカルデモです。架空データの初期値は `src/features/talent/mocks/seed.ts`、保存先は `.local/talent-v02.json` です。旧版のブラウザ localStorage と v0.1 の Supabase テーブルは読み書きしません。外部 AI、Slack、ActionBoard、Supabase の実サービスには接続していません。

JSON ファイルは新規作成時に所有者のみ読み書きできる権限で保存し、一時ファイルからの rename で置換します。同一 Node.js プロセス内の操作は直列化します。複数プロセス・複数サーバーでの同時運用や、本番データの保管には対応していません。既存ファイルが壊れた場合には自動で初期化せず、エラーを返します。ファイルをバックアップしてから削除すると、次のリクエストでデモの初期値に戻ります。

## API と本人の決め方

| API | 応答／用途 |
|---|---|
| `GET /api/talent` | 公開用 BootstrapData。初回デモ利用者は `staff-demo` |
| `POST /api/talent/session` | `{actorId}` にある既知の架空アカウントへ切替 |
| `POST /api/talent` | プロフィール・本人申告・候補確認・面談・推薦・活動・検索・チーム案 |

デモのアカウント切替は本物のログインではありません。HttpOnly / SameSite=Strict の HMAC 署名 cookie をサーバーが発行し、actorId と有効期限を検証します。署名鍵は開発プロセス内で生成し、`TALENT_DEMO_COOKIE_SECRET` で固定もできます。アカウント ID や role を通常の更新入力から指定して権限を変更することはできません。

API は localhost、127.0.0.1、IPv6 loopback 以外のホストを拒否します。更新リクエストは同一 Origin と JSON Content-Type を要求し、100KB の全体上限と各項目の文字数・整数・列挙値・許可キーを検証します。本番モードでは追加で `TALENT_DEMO_ALLOW_PRODUCTION=true` が必要です。このフラグもホスト制限を解除しません。全応答は `Cache-Control: private, no-store` です。

## 公開データと非公開データ

- 一覧・検索に使うのは本人申告、または本人が承認したスキルです。抽出しただけの候補は登録スキルに入りません。
- 本人用の候補・面談履歴は本人だけに返します。推薦文は推薦者・受け取った本人だけに返し、他のスタッフ・サポーターには返しません。
- 公開される根拠は本人が承認した最終表現だけです。Slack 原文・参照 URL・推薦原文を公開根拠へコピーせず、公開 DTO の reference は null にします。
- 組み合わせ希望の `ownerId`、`targetId`、`kind`、`privateNote` は通常の BootstrapData に一切含めません。スタッフも希望の内容やメモを閲覧できません。
- 相性設定は今回の画面・API・追加migration・チーム案作成から除外しました。既存のローカル保存データに設定が残っていても編成には使いません。
- メール・Slack 連絡先は本人とスタッフにだけ返します。

候補承認は元の source（他者推薦／AI発見／活動実績）を保持し、公開表現を本人が修正しても本人申告に変えません。同じ承認を再送しても重複登録しません。本人申告スキルは本人が編集・削除でき、正規化後の重複を拒否します。推薦・AI・活動由来のスキルを本人申告の編集 API から改変することはできません。プロフィール保存はスキル候補・推薦由来・スタッフ権限を変更できません。活動登録、チーム案作成・確認はスタッフ限定です。

相性設定の経緯と今後の検討事項は [README](../README.md#検討中の追加要素) に記載しています。

## Supabase / ActionBoard の将来接続

`supabase/migrations/202609220001_talent_v02.sql` は追加用の未接続スキーマです。新規テーブルはすべて `talent_*` とし、既存の `profiles` / `skills` や ActionBoard のテーブルを変更しません。実プロジェクトへはまだ適用していません。

- 本人 ID は `auth.users.id` です。`server/auth-adapter.ts` の IdentityPort は、`auth.getUser()` 相当の検証済み ID と ActionBoard の `public_user_profiles` を照合する接続点です。公開スキーマを調査済みですが、単独でも使える追加migrationとするためSQLを本家固有テーブルへ直接依存させていません。staff権限は検証済みの管理者設定から別途対応付けます。
- 接続実装が検証済み ID をもとに `talent_profiles`、`talent_contacts`、`talent_memberships` を用意します。role の同期は管理者処理だけで行い、signup metadata や利用者のプロフィール更新では変更できません。
- スキル・公開根拠は認証済み利用者が閲覧できます。候補・面談は本人限定の RLS で、staff を例外にしません。推薦文は当事者だけです。
- 推薦候補や AI 候補の生成は認証・権限を確認するサーバー処理だけが行います。利用者の Data API 権限では候補の source、status、推薦元、作成日時を変更できません。
- `talent_add_self_skill` は本人申告だけを作成し、`talent_review_suggestion` は候補所有者を確認して公開スキル・公開根拠・承認状態を同一トランザクションで更新します。
- 実接続では JSON repository をデータベース repository に、デモ cookie を検証済み ActionBoard 認証に置換します。service role key はサーバーだけに置き、ブラウザへ渡しません。API の入力検証と公開 DTO の投影も引き続き必要です。

## 検証

担当テストは `src/features/talent/server/security.test.ts` です。候補・面談・旧保存データの漏えい、他者候補の承認、source 改変、actor偽装、未知の列挙値、過大入力、署名 cookie と CSRF を確認します。サービス側の抽出・検索・チーム制約テストと併せて実行してください。

```bash
node --experimental-strip-types --test src/features/talent/server/security.test.ts
```
