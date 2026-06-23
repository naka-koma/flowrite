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
├── frontend/src/       # Reactフロントエンド（ソースコードのみ）
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── main.tsx
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
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html           # Viteエントリーポイント
├── .clasp.json          # .gitignore対象（setup.shで生成）
├── appsscript.json      # .gitignore対象（テンプレートから生成）
├── appsscript.template.json
├── README.md
└── CLAUDE.md
```

## セットアップ

### 前提
- [mise](https://mise.jdx.dev/)（Node.jsバージョン管理）
- Google アカウント
- Google Apps Script APIの有効化
  - https://script.google.com/home/usersettings を開いて「Google Apps Script API」をオンにする
- 空のGoogle スプレッドシート（IDをメモしておく）
  - URLの `https://docs.google.com/spreadsheets/d/【このID】/edit` の部分

### 初回セットアップ

```powershell
# mise でツールをインストール
mise install

# clasp をグローバルインストール
npm install -g @google/clasp

# セットアップスクリプトを実行（ログイン→プロジェクト作成→ビルド→デプロイ）
.\scripts\setup.ps1
```

セットアップ完了後、案内に従ってGASスクリプトプロパティを設定する：
- `SPREADSHEET_ID`: スプレッドシートのID
- `GEMINI_API_KEY`: Google AI StudioのAPIキー

### ビルド＆デプロイ

```powershell
.\scripts\deploy.ps1
```
