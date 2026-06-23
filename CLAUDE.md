# CLAUDE.md

Claude Codeがこのリポジトリで作業する際の指針。

## プロジェクト概要

MoneyForwardのCSVを取り込み、GAS WebApp上でReactダッシュボードとして表示する家計管理システム。詳細は各ドキュメントを参照。

- システム構成 → [docs/architecture.md](docs/architecture.md)
- API仕様 → [docs/api.md](docs/api.md)
- スプレッドシート定義 → [docs/schema.md](docs/schema.md)
- CSVフォーマット → [docs/csv-format.md](docs/csv-format.md)

## 技術スタック

- **フロントエンド:** React 18+、TypeScript、Vite、vite-plugin-singlefile、Recharts
- **バックエンド:** Google Apps Script（JavaScript）、@types/google-apps-script
- **デプロイ:** clasp

## フォルダ構成と役割

```
frontend/src/
  components/   UIコンポーネント（チャート・フォーム・レイアウト）
  hooks/        APIコール・データ取得ロジック（useUpload, useSummaryなど）
  types/        共有型定義（APIレスポンス型など）

gas/
  Code.js         doGet / doPost のエントリーポイントのみ。ロジックは持たない
  routes.js       action パラメータによる振り分け
  csv.js          CSVパース・Shift-JIS変換・重複排除
  spreadsheet.js  raw_dataシートへの読み書き
  summary.js      月次・カテゴリ別集計
  gemini.js       Gemini API呼び出し
```

## ビルド・デプロイ

```bash
# フロントエンドのビルド→GASへのデプロイを一括実行
./scripts/deploy.sh
```

## GASの制約と注意事項

- **単一エントリーポイント:** `doGet` と `doPost` のみ。ルーティングは `e.parameter.action` で行う
- **レスポンス形式:** `ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)`
- **index.html:** `doGet` が返すファイル。ビルド成果物なので手動編集禁止
- **Shift-JIS:** `Utilities.newBlob` + `getDataAsString('Shift_JIS')` でデコードする
- **秘匿情報:** スプレッドシートIDとGemini APIキーは `PropertiesService.getScriptProperties()` から取得する
  - キー名: `SPREADSHEET_ID`、`GEMINI_API_KEY`
- **実行時間制限:** 1回の実行は最大6分。大量データ処理に注意

## フロントエンドの制約と注意事項

- **ビルド成果物は1ファイル:** `vite-plugin-singlefile` でJS/CSSをインライン化する。外部CDN依存は避ける
- **APIコール:** `google.script.run` は使わず、`fetch` で `?action=xxx` にリクエストする
- **環境変数:** `import.meta.env` は使用不可。定数はソースに直書きするか、GASの初期レスポンスに含めて渡す

## コーディング規約

### 共通
- コメントは日本語可
- 変数名・関数名は英語（キャメルケース）
- エラーは握りつぶさず、レスポンスに含める

### フロントエンド（TypeScript）
- `any` 禁止。不明な型は `unknown` + 型ガード
- APIレスポンス型は `types/` に定義してフックと共有する
- コンポーネントは小さく分割する

### GAS（JavaScript）
- `var` 禁止。`const` / `let` を使う
- スプレッドシート操作は `getValues` / `setValues` で一括処理する（ループ内の逐次読み書き禁止）
- `Logger.log` でデバッグログを残す

## 開発フロー

mainブランチへの直接pushは禁止。すべての変更はPRを経由する。

### ブランチ運用

1. mainから作業ブランチを作成する
2. 作業ブランチで実装・コミットする
3. pushしてPRを作成し、mainへのマージを依頼する

### ブランチ命名規則

- 機能追加: `feature/<簡潔な説明>` (例: `feature/add-budget-chart`)
- バグ修正: `fix/<簡潔な説明>` (例: `fix/csv-encoding-error`)
- リファクタリング: `refactor/<簡潔な説明>`
- ドキュメント: `docs/<簡潔な説明>`

Issueに紐づく場合はIssue番号を含める: `feature/123-add-budget-chart`

### Claude Codeの作業手順

実装タスクを受けたら以下の手順で進める:

1. **ブランチ作成:** mainから作業ブランチを切る (`git checkout -b feature/xxx main`)
2. **実装・コミット:** 変更を実装し、適切な粒度でコミットする
3. **push・PR作成:** 作業が完了したら `git push -u origin <branch>` してPRを作成する。PRのタイトルとサマリは変更内容に基づいて自動生成する。Issueに紐づく場合はPR本文に `Closes #<number>` を含める

## 作業時の注意

- `gas/index.html` はビルド成果物。フロントエンドの変更は `frontend/src` を編集してビルドし直す
- 実装の優先順位はIssueに従う
