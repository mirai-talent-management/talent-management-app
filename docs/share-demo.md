# URLで共有するデモ

[公開中の共有デモ](https://talent-management-app-amber.vercel.app/)から、インストールなしで統合版を操作できます。

`NEXT_PUBLIC_SHARED_DEMO=true` を設定してビルドすると、統合版と単独版v0.2の操作結果を各閲覧者のブラウザ内に保存します。架空の初期データだけを使用し、DB、APIキー、実ログインは不要です。別の閲覧者の操作結果は混ざりません。ブラウザのサイトデータを削除すると、その人の操作結果は初期化されます。

公開版では `/api/talent` と `/api/action-board-demo` のサーバーAPIを拒否します。画面でのアカウント切替、ミッション達成、スキル候補の承認、検索、チーム案作成などはブラウザ内で動きます。メール・Slackは文面作成とデモ送信の表示のみで、実送信しません。アクションボード本体にも接続しません。

## ローカルで公開版を確認する

```bash
npm ci
NEXT_PUBLIC_SHARED_DEMO=true npm run build
NEXT_PUBLIC_SHARED_DEMO=true npm start
```

`http://127.0.0.1:3000` で統合デモが開きます。ローカル版の開発サーバーと同時に使う場合は別のポートを指定してください。通常のローカル版に戻すには、上の環境変数を外して再ビルドします。

## 公開先の例

Vercelにログインしている場合は、[Vercel CLIの手順](https://vercel.com/docs/cli/deploy)に従い、このディレクトリからソースをデプロイできます。ビルド時に `NEXT_PUBLIC_SHARED_DEMO=true` を設定してください。CLIからのアップロードでは、`.vercelignore` が `.local/`、環境変数ファイル、ローカルビルド生成物を除外します。公開前に発行されたURLで、画面表示と操作後の再読み込み、`/api/action-board-demo` が403を返すことを確認してください。

現行のVercelプロジェクトはCLIから手動でデプロイしています。GitHubの組織所有・非公開リポジトリとHobbyプランの組み合わせでは自動接続ができなかったため、mainブランチへのpushだけでは公開サイトは更新されません。再デプロイには、このリポジトリから `npx vercel deploy --prod --yes --build-env NEXT_PUBLIC_SHARED_DEMO=true --env NEXT_PUBLIC_SHARED_DEMO=true` を実行し、公開URLの画面とAPI停止を再確認します。

これはアイデア共有用の非公式デモです。URLを知る人が架空データを操作できます。入力した内容はそのブラウザ内に残るため、実在の人物・連絡先・機密情報は入力しないでください。
