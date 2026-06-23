# flowrite

MoneyForwardのCSVをGAS WebAppで取り込み、スプレッドシートにデータを蓄積しながら、Reactフロントエンドで可視化・分析するシステム。

## 概要

- MoneyForwardからエクスポートしたCSV（複数月分）をアップロードして蓄積
- カテゴリ別・月次の支出サマリーをグラフで表示
- Gemini APIを通じて支出傾向の分析・アドバイスを取得

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | システム全体構成・データフロー |
| [docs/api.md](docs/api.md) | APIインターフェース仕様 |
| [docs/schema.md](docs/schema.md) | スプレッドシートのシート・カラム定義 |
| [docs/csv-format.md](docs/csv-format.md) | MoneyForward CSVのフォーマット・注意事項 |
| [docs/setup-design.md](docs/setup-design.md) | setup.sh の設計・実行フロー |

## 技術スタック

- **フロントエンド:** React + TypeScript + Vite + vite-plugin-singlefile + Recharts
- **バックエンド:** Google Apps Script + Google Spreadsheet + Gemini API
- **デプロイ:** clasp

## フォルダ構成

```
/
├── frontend/           # Reactフロントエンド
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── gas/                # GASバックエンド
│   ├── Code.js
│   ├── routes.js
│   ├── csv.js
│   ├── spreadsheet.js
│   ├── summary.js
│   ├── gemini.js
│   └── index.html      # ビルド済みフロントエンド（自動生成・手動編集禁止）
│
├── scripts/
│   └── deploy.sh       # ビルド→デプロイ自動化
│
├── docs/               # 設計ドキュメント
├── .clasp.json              # .gitignore対象（setup.shで生成）
├── appsscript.json          # .gitignore対象（テンプレートから生成）
├── appsscript.template.json # appsscript.jsonのテンプレート
├── README.md
└── CLAUDE.md
```

## セットアップ

### 前提
- Node.js 20以上
- clasp（`npm install -g @google/clasp`）
- Google アカウント（GASプロジェクト・スプレッドシート作成済み）

### 初回セットアップ

```bash
# claspログイン
clasp login

# フロントエンド依存インストール
cd frontend && npm install

# .clasp.json に scriptId を設定
# GASスクリプトプロパティに以下を登録
#   SPREADSHEET_ID: 対象スプレッドシートのID
#   GEMINI_API_KEY: Gemini APIキー
```

### ビルド＆デプロイ

```bash
./scripts/deploy.sh
```
