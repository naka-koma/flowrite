# システムアーキテクチャ

## 全体構成

```
MoneyForward CSV（Shift-JIS）
  ↓ 複数月分を一括アップロード
GAS WebApp（doGet）
  ├── フロントエンド配信         doGet → index.html を返す
  └── google.script.run 経由で呼び出される関数群
      ├── CSVアップロード        handleUpload
      ├── 月次サマリー取得       handleSummary
      ├── トレンドデータ取得     handleTrend
      ├── AIアドバイス取得       handleAiAdvice
      ├── 設定取得・更新         handleGetSettings / handleUpdateSettings
      └── マイグレーション実行   handleRunMigrations
            ↓                        ↓
  Google Spreadsheet          Gemini API
  （raw_data シート）
```

GAS WebAppのHTMLはgoogleusercontent.comのサンドボックスiframe内で描画され、`ContentService` はCORSヘッダーを設定できないため、フロントエンドから `fetch` で自己エンドポイント（doGet/doPost）を呼び出すことはできない。そのためAPI呼び出しはすべて `google.script.run` を使う（詳細は [docs/api.md](docs/api.md)）。

## レイヤー構成

### フロントエンド
Vite + React + TypeScript でビルドし、`vite-plugin-singlefile` によってJS/CSSをHTMLにインライン化した単一ファイルとして出力する。GAS WebApp の `doGet` がこのファイルを返すことで、ブラウザ上でSPAとして動作する。APIコールは `google.script.run` 経由で行う。

### GAS WebApp
`doGet` はHTML配信専用の単一エントリーポイント。API呼び出しは `google.script.run` からグローバル関数（`handleUpload` など）が直接呼び出される。スプレッドシートのデータ操作・集計・Gemini API連携はすべてここで行う。

### データストア
Google Spreadsheet の `raw_data` シートに全トランザクションを蓄積する。集計はリクエスト時にGAS側でオンザフライに行う。集計済みキャッシュシートは持たない（データ量が家計レベルであれば不要）。

## データフロー

### CSVアップロード時
1. フロントエンドがCSVファイルをBase64エンコードし `google.script.run.handleUpload(...)` を呼び出す
2. GASがShift-JISデコード → パース → ID列で重複チェック
3. 未登録行のみ `raw_data` シートに追記

### サマリー・トレンド取得時
1. フロントエンドが `google.script.run.handleSummary(...)` / `handleTrend()` を呼び出す
2. GASが `raw_data` を読み込んで集計
3. 集計結果オブジェクトをそのままコールバックで受け取る

### AIアドバイス取得時
1. フロントエンドが集計済みコンテキストを `google.script.run.handleAiAdvice(...)` に渡す
2. GASがGemini APIにリクエスト
3. レスポンステキストをそのままコールバックで受け取る

## デプロイ構成

```
ローカル
  frontend/        Reactソース
  gas/             GASソース + ビルド済みindex.html

  ↓ ./scripts/deploy.sh

GASプロジェクト（clasp経由）
  Code.js / csv.js / spreadsheet.js / summary.js / gemini.js / settings.js / migration.js
  index.html（ビルド成果物）

  ↓ clasp deploy

GAS WebApp URL（公開エンドポイント）
```
