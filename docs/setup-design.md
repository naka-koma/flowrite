# setup.sh 設計書

初回セットアップを自動化するシェルスクリプトの設計。

## 概要

`setup.sh` を実行することで、以下を自動化する。

1. clasp login（Google認証）
2. GASプロジェクト作成 → `.clasp.json` 生成
3. スプレッドシートIDの入力 → `appsscript.json` に書き込み
4. 初回 `clasp push`
5. 初回 `clasp deploy` → deployId 取得 → `.clasp.json` に追記
6. 手動設定が必要な項目の案内を表示して終了

## 実行フロー

```
setup.sh
  │
  ├─ [チェック] clasp がインストールされているか確認
  │    └─ 未インストールの場合はエラーメッセージを出して終了
  │
  ├─ [チェック] frontend/node_modules が存在するか確認
  │    └─ 存在しない場合は npm install を実行
  │
  ├─ clasp login
  │    └─ ブラウザが開いてGoogle認証を促す
  │
  ├─ clasp create --title "家計管理ダッシュボード" --type webapp --rootDir ./gas
  │    └─ gas/.clasp.json が生成される（scriptId が自動入力される）
  │    └─ 生成された gas/.clasp.json をプロジェクトルートの .clasp.json にコピー
  │
  ├─ [対話] スプレッドシートIDの入力を促す
  │    └─ 入力値を appsscript.json の properties.SPREADSHEET_ID に書き込む
  │         ※ appsscript.json はテンプレート（appsscript.template.json）から生成する
  │
  ├─ clasp push
  │    └─ gas/ 配下のファイルをGASプロジェクトにアップロード
  │
  ├─ clasp deploy --description "initial deployment"
  │    └─ deployId を取得して .clasp.json に追記
  │
  └─ 手動設定案内を表示して終了
       - GASスクリプトプロパティの設定手順
       - SPREADSHEET_ID（入力済みの値を再掲）
       - GEMINI_API_KEY（手動設定が必要）
```

## ファイル構成

### appsscript.template.json

`appsscript.json` のテンプレートファイル。`setup.sh` がこれをもとに `appsscript.json` を生成する。リポジトリにはこちらをコミットし、`appsscript.json` は `.gitignore` に追加する。

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}
```

### .clasp.json の最終形

```json
{
  "scriptId": "<clasp createで自動生成>",
  "rootDir": "./gas",
  "deploymentId": "<clasp deployで取得>"
}
```

## 手動設定案内の表示内容

setup.sh の最後に以下を表示する。

```
========================================
  セットアップ完了
========================================

次の手順でスクリプトプロパティを手動設定してください。

1. 以下のURLをブラウザで開く
   https://script.google.com/d/<scriptId>/edit

2. 左メニュー「プロジェクトの設定」を開く

3. 「スクリプト プロパティ」に以下を追加する

   SPREADSHEET_ID : <入力したスプレッドシートID>
   GEMINI_API_KEY : <Google AI StudioのAPIキー>

4. 設定後、deploy.sh を実行してデプロイ完了

========================================
```

## エラーハンドリング

| 状況 | 対応 |
|---|---|
| clasp 未インストール | エラーメッセージ + インストールコマンドを案内して終了 |
| clasp login 失敗 | エラーメッセージを出して終了 |
| clasp create 失敗 | エラーメッセージを出して終了（Apps Script APIの有効化を案内） |
| clasp deploy の出力からdeployIdが取得できない | 警告を表示し、手動確認を案内（処理は続行） |

## 注意事項

- `appsscript.json` と `.clasp.json` は `.gitignore` に追加する（スプレッドシートIDが含まれるため）
- テンプレートとして `appsscript.template.json` をリポジトリに含める
- `setup.sh` は冪等ではない（2回目以降の実行は想定しない）。再セットアップが必要な場合は `.clasp.json` と `appsscript.json` を削除してから実行する
