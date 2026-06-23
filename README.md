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

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 18 + TypeScript + Vite + vite-plugin-singlefile + Recharts |
| バックエンド | Google Apps Script + Google Spreadsheet + Gemini API |
| ランタイム管理 | [mise](https://mise.jdx.dev/)（`.mise.toml` でNode.jsバージョンを固定） |
| デプロイ | [clasp](https://github.com/google/clasp)（GAS CLIツール） |

## フォルダ構成

```
/
├── frontend/src/       # Reactフロントエンド（ソースコードのみ）
│   ├── components/     #   UIコンポーネント
│   ├── hooks/          #   APIコール・データ取得ロジック
│   ├── types/          #   共有型定義
│   └── main.tsx
│
├── gas/                # GASバックエンドソースコード
│   ├── Code.js         #   doGet/doPost エントリーポイント
│   ├── routes.js       #   action パラメータによる振り分け
│   ├── csv.js          #   CSVパース・Shift-JIS変換・重複排除
│   ├── spreadsheet.js  #   raw_dataシートへの読み書き
│   ├── summary.js      #   月次・カテゴリ別集計
│   └── gemini.js       #   Gemini API呼び出し
│
├── build/              # ビルド出力（自動生成・gitignore対象）
│
├── scripts/
│   ├── build.js        # ビルドスクリプト（tsc + vite + GASファイルコピー）
│   └── setup.js        # 初回セットアップ自動化
│
├── docs/               # 設計ドキュメント
├── package.json        # npm scripts / 依存定義
├── vite.config.ts      # Viteビルド設定
├── tsconfig.json       # TypeScript設定
├── index.html          # Viteエントリーポイント
├── .mise.toml          # Node.jsバージョン指定
├── .clasp.json         # clasp設定（.gitignore対象）
├── appsscript.json     # GAS設定（.gitignore対象）
├── appsscript.template.json  # appsscript.jsonのテンプレート
├── CLAUDE.md           # Claude Code作業指針
└── README.md
```

## 開発フロー

mainブランチへの直接pushは禁止。すべての変更はPull Requestを経由する。

### ブランチ運用

1. mainから作業ブランチを作成する
2. 作業ブランチで実装・コミットする
3. pushしてPRを作成し、mainへマージする

### ブランチ命名規則

| 種別 | プレフィックス | 例 |
|---|---|---|
| 機能追加 | `feature/` | `feature/add-budget-chart` |
| バグ修正 | `fix/` | `fix/csv-encoding-error` |
| リファクタリング | `refactor/` | `refactor/extract-api-client` |
| ドキュメント | `docs/` | `docs/update-api-spec` |

Issueに紐づく場合はIssue番号を含める（例: `feature/123-add-budget-chart`）。

### PR作成

```bash
# ブランチをpushしてPRを作成
git push -u origin <branch>
gh pr create --fill
```

## セットアップ

### 前提条件

1. **[GitHub CLI（gh）](https://cli.github.com/) のインストール**

   ```bash
   # Windows (winget)
   winget install GitHub.cli

   # macOS (Homebrew)
   brew install gh
   ```

   インストール後、認証を行う：
   ```bash
   gh auth login
   ```

2. **[mise](https://mise.jdx.dev/) のインストール**

   ```bash
   # Windows (winget)
   winget install jdx.mise

   # macOS (Homebrew)
   brew install mise
   ```

   インストール後、シェルにactivateを追加する：
   ```bash
   # PowerShell (~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1)
   & mise activate pwsh | Out-String | Invoke-Expression

   # Bash (~/.bashrc)
   eval "$(mise activate bash)"

   # Zsh (~/.zshrc)
   eval "$(mise activate zsh)"
   ```

   設定後、**ターミナルを再起動**する。

3. **Google アカウント**

4. **Google Apps Script APIの有効化**
   - https://script.google.com/home/usersettings を開く
   - 「Google Apps Script API」をオンにする
   - 有効化後、反映まで数分かかる場合がある

5. **空のGoogle スプレッドシートを作成**
   - IDをメモしておく（URLの `https://docs.google.com/spreadsheets/d/【このID】/edit` の部分）
   - シートは空のままでOK（`raw_data`、`ai_log` はGASが自動作成する）

### 初回セットアップ

```bash
# Node.js をインストール（.mise.toml に従ってバージョンが決まる）
mise install

# 依存パッケージをインストール
npm install

# clasp をグローバルインストール
npm install -g @google/clasp

# セットアップを実行（ログイン→プロジェクト作成→ビルド→デプロイ）
npm run setup
```

`npm run setup` は以下を順番に実行する：
1. `clasp login`（ブラウザでGoogleアカウント認証）
2. `clasp create`（GASプロジェクト作成）
3. `npm run build`（フロントエンドビルド）
4. `clasp push` + `clasp deploy`（GASへデプロイ）

セットアップ完了後、案内に従ってGASスクリプトプロパティを設定する：

| プロパティ名 | 値 |
|---|---|
| `SPREADSHEET_ID` | 作成したスプレッドシートのID |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) で取得したAPIキー |

### npm scripts

| コマンド | 説明 |
|---|---|
| `npm run dev` | Vite開発サーバー起動 |
| `npm run build` | TypeScriptチェック + Viteビルド + GASファイルコピー（`build/` に出力） |
| `npm run typecheck` | TypeScript型チェックのみ |
| `npm run deploy` | ビルド + `clasp push`（GASへデプロイ） |
| `npm run open` | GASスクリプトエディタをブラウザで開く |
| `npm run open:webapp` | デプロイ済みWebAppをブラウザで開く |
| `npm run setup` | 初回セットアップ |

### トラブルシューティング

**`clasp login` で `Premature close` エラーが出る**

Node.jsのバージョンによるネットワークの問題。`.mise.toml` の `node = "20"` で Node.js 20 を使うことで回避できる。

**`clasp create` で `User has not enabled the Apps Script API` と出る**

https://script.google.com/home/usersettings でAPIを有効化して数分待ってからリトライ。

**`clasp push` で `Project settings not found` と出る**

`.clasp.json` がプロジェクトルートに存在するか確認。`npm run setup` を再実行すると復旧できる（ログイン・作成済みの場合はスキップされる）。
