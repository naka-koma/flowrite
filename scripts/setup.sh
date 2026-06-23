#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== flowrite セットアップ ==="
echo ""

# clasp チェック
if ! command -v clasp &> /dev/null; then
  echo "ERROR: clasp がインストールされていません"
  echo "  npm install -g @google/clasp"
  exit 1
fi

# 依存インストール
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo "=== npm install ==="
  cd "$PROJECT_ROOT"
  npm install
fi

# clasp login
echo ""
echo "=== clasp login ==="
echo "ブラウザが開きます。Googleアカウントで認証してください。"
clasp login

# clasp create
echo ""
echo "=== GASプロジェクト作成 ==="
cd "$PROJECT_ROOT/gas"
clasp create --title "家計管理ダッシュボード" --type webapp --rootDir .

# gas/.clasp.json → プロジェクトルートに移動
if [ -f "$PROJECT_ROOT/gas/.clasp.json" ]; then
  mv "$PROJECT_ROOT/gas/.clasp.json" "$PROJECT_ROOT/.clasp.json"
fi

# appsscript.json をテンプレートから生成
echo ""
echo "=== appsscript.json 生成 ==="
cp "$PROJECT_ROOT/appsscript.template.json" "$PROJECT_ROOT/gas/appsscript.json"

# スプレッドシートID入力
echo ""
read -rp "スプレッドシートIDを入力してください: " SPREADSHEET_ID

# clasp push
echo ""
echo "=== clasp push ==="
cd "$PROJECT_ROOT"
clasp push

# clasp deploy
echo ""
echo "=== clasp deploy ==="
DEPLOY_OUTPUT=$(clasp deploy --description "initial deployment" 2>&1)
echo "$DEPLOY_OUTPUT"

# scriptId 取得
SCRIPT_ID=$(cat "$PROJECT_ROOT/.clasp.json" | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "========================================"
echo "  セットアップ完了"
echo "========================================"
echo ""
echo "次の手順でスクリプトプロパティを手動設定してください。"
echo ""
echo "1. 以下のURLをブラウザで開く"
echo "   https://script.google.com/d/${SCRIPT_ID}/edit"
echo ""
echo "2. 左メニュー「プロジェクトの設定」を開く"
echo ""
echo "3.「スクリプト プロパティ」に以下を追加する"
echo ""
echo "   SPREADSHEET_ID : ${SPREADSHEET_ID}"
echo "   GEMINI_API_KEY  : <Google AI StudioのAPIキー>"
echo ""
echo "4. 設定後、deploy.sh を実行してデプロイ完了"
echo ""
echo "========================================"
