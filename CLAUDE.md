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

gas/                GASソースコード（デプロイ時にbuild/へコピーされる）
  Code.js         doGet のエントリーポイントのみ（HTML配信専用）
  csv.js          CSVパース・Shift-JIS変換・重複排除・handleUpload
  spreadsheet.js  raw_dataシートへの読み書き
  summary.js      月次・カテゴリ別集計・handleSummary/handleTrend
  gemini.js       Gemini API呼び出し・handleAiAdvice

build/              ビルド成果物（自動生成・gitignore対象）
  index.html      Viteがビルドしたフロントエンド
  *.js            gas/からコピーされたGASソース
  appsscript.json GAS設定
```

## ビルド・デプロイ

```bash
# ビルドのみ（build/ディレクトリに出力）
npm run build

# ビルド→GASへのデプロイを一括実行
npm run deploy
```

## GASの制約と注意事項

- **単一エントリーポイント:** `doGet` はHTML配信専用。API呼び出しは `google.script.run` から `handleUpload` / `handleSummary` / `handleTrend` / `handleAiAdvice` などのグローバル関数を直接呼び出す
  - GAS WebAppのHTMLはgoogleusercontent.comのサンドボックスiframe内で描画され、`ContentService` はCORSヘッダーを設定できないため、`fetch` による自己エンドポイント呼び出しは使えない（詳細は [docs/api.md](docs/api.md)）
- **index.html:** `doGet` が返すファイル。`build/index.html` はビルド成果物なので手動編集禁止
- **Shift-JIS:** `Utilities.newBlob` + `getDataAsString('Shift_JIS')` でデコードする
- **秘匿情報:** Gemini APIキーは `PropertiesService.getScriptProperties()` から取得する
  - キー名: `GEMINI_API_KEY`
- **スプレッドシート:** コンテナバインド型スクリプトのため `SpreadsheetApp.getActiveSpreadsheet()` で取得する
- **実行時間制限:** 1回の実行は最大6分。大量データ処理に注意

## フロントエンドの制約と注意事項

- **ビルド成果物は1ファイル:** `vite-plugin-singlefile` でJS/CSSをインライン化する。外部CDN依存は避ける
- **APIコール:** `frontend/src/lib/googleScriptRun.ts` の `runScript<T>(functionName, ...args)` を介して `google.script.run` を呼び出す。`fetch` でのAPI呼び出しはCORSの制約上使えない
- **環境変数:** `import.meta.env` は使用不可。定数はソースに直書きするか、GASの初期レスポンスに含めて渡す

## テスト方針

- **E2E必須:** フロントエンド機能を実装するときは、Playwrightのテストと `google.script.run` モックを必ずセットで実装する
- **テストの置き場:** `tests/<feature>.spec.ts`
- **モックの置き場:** `frontend/src/mocks/googleScriptRun.ts` に関数名ごとのモック実装を追加する。開発ビルド時（`import.meta.env.DEV`）に `main.tsx` が自動でセットアップする
- **シナリオ切り替え:** データなし等の分岐が必要な場合、`page.addInitScript` で `window.__MOCK_SCENARIO__` を設定してモック側の分岐条件にする
- **実行:** `npm run test:e2e`
- GAS WebAppへの実際のリクエストは発生させない

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

#### A. Issue先行パターン（「#N を実装して」）

1. **Issue確認:** `gh issue view <number>` でIssueの内容を読み、要件を把握する
2. **ブランチ作成:** mainから作業ブランチを切る (`git checkout -b feature/<number>-xxx main`)
3. **実装・コミット:** 変更を実装し、適切な粒度でコミットする
4. **push・PR作成:** `git push -u origin <branch>` してPRを作成する。PR本文に `Closes #<number>` を含める
5. **マージ後クリーンアップ:** ユーザーがPRをマージしたことを伝えたら、以下を実行する
   ```bash
   git checkout main
   git pull
   git branch -d <branch>
   ```
6. **デプロイ確認:** クリーンアップ完了後、mainをデプロイするかユーザーに確認する。同意が得られたら `/deploy` スキルを実行する

#### B. Plan先行パターン（計画してからIssueを立てる）

1. **計画:** ユーザーと一緒に設計・実装計画を練る
2. **Issue作成:** `gh issue create` で計画内容をIssueに記録する
3. **以降はAと同じ:** ブランチ作成→実装→PR（`Closes #<number>`付き）
   - マージ後クリーンアップ・デプロイ確認も同様に実施する

### マージに関する禁止事項

**PRのマージはユーザーが手動で行う。Claude Codeからは絶対にマージしない。**

以下の操作はすべて禁止:
- `gh pr merge` — PRのマージ
- `gh pr close` — PRのクローズ
- `gh pr review --approve` — PRの承認
- `gh api` でのマージAPI呼び出し
- `git merge` — ローカルでのマージ

Claude Codeの作業範囲はPR作成まで。マージ判断はユーザーに委ねる。

## 作業時の注意

- `build/` はビルド成果物。フロントエンドの変更は `frontend/src` を編集して `npm run build` し直す
- 実装の優先順位はIssueに従う
