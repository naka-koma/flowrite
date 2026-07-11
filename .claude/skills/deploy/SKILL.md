---
description: フロントエンドのビルドとGASへのデプロイを実行する。
user-invocable: true
---

## 手順

1. デプロイ前チェック
   - `git status` で未コミットの変更がないか確認する
   - 未コミットの変更がある場合はユーザーに警告し、続行するか確認する
2. 以下を実行する（`clasp`は`npx`経由で解決されるため、OS・シェルを問わず動作する）
   ```
   npm run deploy
   ```
3. デプロイ結果を報告する
   - 成功時: WebApp URLを提示し、動作確認を促す
   - 失敗時: エラー内容と対処方法を案内する

## 引数

`$ARGUMENTS` に `--skip-check` が含まれる場合は未コミットチェックをスキップする

## 注意

- `clasp login` 未実施かつ `CLASP_CREDENTIALS` 環境変数も未設定の場合は `npm run setup` を促す（README.mdの「リモート環境からのデプロイ」参照）
  - GUIブラウザを自動起動できない環境（リモートセッション等）では `CLASP_LOGIN_NO_LOCALHOST=1 npm run setup` を使い、表示された認可URLをユーザーに開いてもらい、リダイレクト先のURL全体を貼り付けてもらう
- `.clasp.json` が存在せず `CLASP_SCRIPT_ID` 環境変数も未設定の場合は、Script IDの入力（`npm run setup`）を促す
- 新規環境で `npm run setup` を実行する際、既存のWebAppデプロイメントIDを把握していれば入力するようユーザーに確認する（空欄のまま進めると別のデプロイメントが新規作成され、既存のWebApp URLとは別物になる）
- デプロイは本番環境への反映であることをユーザーに明示する
