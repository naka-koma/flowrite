---
description: フロントエンドのビルドとGASへのデプロイを実行する。
user-invocable: true
---

## 手順

1. デプロイ前チェック
   - `git status` で未コミットの変更がないか確認する
   - 未コミットの変更がある場合はユーザーに警告し、続行するか確認する
2. PowerShellで以下を実行する（mise経由でNode.js/claspのパスを通す）
   ```
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User"); $env:Path = "C:\Users\sakur\AppData\Local\mise\installs\node\20.20.2;" + $env:Path; npm run deploy
   ```
3. デプロイ結果を報告する
   - 成功時: WebApp URLを提示し、動作確認を促す
   - 失敗時: エラー内容と対処方法を案内する

## 引数

`$ARGUMENTS` に `--skip-check` が含まれる場合は未コミットチェックをスキップする

## 注意

- `clasp login` が未実施の場合はログインを促す
- デプロイは本番環境への反映であることをユーザーに明示する
