# システムアーキテクチャ

## 全体構成

```
MoneyForward CSV（Shift-JIS）
  ↓ 複数月分を一括アップロード
GAS WebApp（doGet / doPost）
  ├── フロントエンド配信     doGet → index.html を返す
  ├── CSVアップロード        action=upload
  ├── 月次サマリー取得       action=summary
  ├── トレンドデータ取得     action=trend
  └── AIアドバイス取得       action=ai-advice
            ↓                        ↓
  Google Spreadsheet          Gemini API
  （raw_data シート）
```

## レイヤー構成

### フロントエンド
Vite + React + TypeScript でビルドし、`vite-plugin-singlefile` によってJS/CSSをHTMLにインライン化した単一ファイルとして出力する。GAS WebApp の `doGet` がこのファイルを返すことで、ブラウザ上でSPAとして動作する。

### GAS WebApp
`doGet` と `doPost` を単一エントリーポイントとし、`e.parameter.action` によって処理を振り分ける。スプレッドシートのデータ操作・集計・Gemini API連携はすべてここで行う。

### データストア
Google Spreadsheet の `raw_data` シートに全トランザクションを蓄積する。集計はリクエスト時にGAS側でオンザフライに行う。集計済みキャッシュシートは持たない（データ量が家計レベルであれば不要）。

## データフロー

### CSVアップロード時
1. フロントエンドがCSVファイルをBase64エンコードしてPOST
2. GASがShift-JISデコード → パース → ID列で重複チェック
3. 未登録行のみ `raw_data` シートに追記

### サマリー・トレンド取得時
1. フロントエンドがGETリクエスト（action + 月指定など）
2. GASが `raw_data` を読み込んで集計
3. JSON形式でレスポンス

### AIアドバイス取得時
1. フロントエンドが集計済みコンテキストをPOST
2. GASがGemini APIにリクエスト
3. レスポンステキストをそのままフロントエンドに返す

## デプロイ構成

```
ローカル
  frontend/        Reactソース
  gas/             GASソース + ビルド済みindex.html

  ↓ ./scripts/deploy.sh

GASプロジェクト（clasp経由）
  Code.js / routes.js / csv.js / ...
  index.html（ビルド成果物）

  ↓ clasp deploy

GAS WebApp URL（公開エンドポイント）
```
