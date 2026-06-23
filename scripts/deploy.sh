#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== フロントエンドビルド ==="
cd "$PROJECT_ROOT"
npm run build

echo ""
echo "=== clasp push ==="
cd "$PROJECT_ROOT"
clasp push

echo ""
echo "=== デプロイ完了 ==="
echo "clasp deploy でWebAppを更新してください（初回以降）"
