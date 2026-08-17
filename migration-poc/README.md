# migration-poc

[Issue #217](https://github.com/naka-koma/flowrite/issues/217) / [Issue #218](https://github.com/naka-koma/flowrite/issues/218)（Phase 1: 前提検証）のための使い捨て検証コード置き場。

flowrite本体（`frontend/`・`gas/`）とは独立しており、アプリの一部としてデプロイされることはない。検証が終わったら削除するか、Phase 2以降の実装で作り直す前提。

## 構成

- `shift-jis-check/` — WorkersランタイムでShift-JISデコードができるかの確認
- `csv-cpu-benchmark/` — CSVパース処理のCPU時間実測（Workers無料枠の10ms制限と比較する）
- `sql-queries/` — 既存の集計ロジック（`handleSummary`/`handleTrend`相当）をSQLで書けるかの確認

## 実行方法

各ディレクトリのREADME/コメントを参照。`npx wrangler dev`はCloudflareアカウントへのログインなしでローカル実行できる（`workerd`をローカルで動かすだけのため）。
