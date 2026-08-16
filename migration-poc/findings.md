# Phase 1 前提検証（PoC）結果

[Issue #217](https://github.com/naka-koma/flowrite/issues/217) / [Issue #218](https://github.com/naka-koma/flowrite/issues/218) の検証結果。検証コードは `migration-poc/` 配下。

## 結論（サマリー）

- **CPUバウンドな処理（CSVパース）は、行数が多いとWorkers無料枠のCPU時間制限(10ms/リクエスト)を超える。** ただしCSVパースをサーバーではなくブラウザ側で行う設計に変えれば、この制約自体を回避できる（Workersが受け取るのは構造化済みJSONになる）
- Shift-JISデコードはworkerd（Cloudflare Workersのローカル実行ランタイム）上で問題なく動作する
- D1（SQLite互換）で、既存の集計ロジック（`handleSummary`/`handleTrend`相当）は素直なSQLで書ける
- 移行先はCloudflare一択ではなく、複数の観点で比較検討する必要がある（詳細は下記）

## 1. 移行先候補の比較

| 候補 | コスト | 運用の手間 | 移植性 | 実行時間/リソース制限 |
|---|---|---|---|---|
| **Cloudflare Workers + Pages + D1** | 無料枠が広い（個人利用なら収まる可能性が高い） | 最小（マネージド、単一ベンダー） | 低い（D1はCloudflare専用。Workers APIもプラットフォーム固有部分がある） | CPU時間制限あり（無料10ms/リクエスト）。今回の検証で回避策あり |
| **Cloudflare Workers + Pages + Hyperdrive経由の外部Postgres（Neon等）** | ほぼ無料（Neon等の無料枠） | やや増える（2ベンダー） | 中（Postgresは標準的。Workers側は上と同様） | 上と同じくCPU時間制限あり |
| **Fly.io / Render等のVM/コンテナ型PaaS** | 小規模なら無料〜低額 | 中（コンテナのデプロイ管理が必要） | 高い（標準的なDockerコンテナ + Postgres。オンプレへの持ち込みが容易） | CPU時間の制限はなく、通常のサーバーと同じ時間制限（実質無制限に近い） |
| **自宅サーバー/VPSでのセルフホスト（オンプレ）** | サーバー代のみ（既に何かあれば実質0円） | 最大（OS・証明書・監視まで自前） | 最高 | 制限なし |

**所感:** 「まず無料で軽く始めたい」ならCloudflare、「将来オンプレへの移行を具体的に見込む」ならFly.io/VPS + Postgresの方が移植性は高い。今回はCPU時間制限の回避策（クライアントサイドパース）が見つかったため、Cloudflareの制約は致命的ではなくなった。**この比較軸だけでは決め切れず、最終判断はユーザーの運用方針（無料枠へのこだわり度合い、将来オンプレ化の確度）に依存する。**

## 2. 実行環境のリソース制限の実測

検証コード: `migration-poc/csv-cpu-benchmark/`

`gas/csv.js` の `parseCsv` / `buildExistingRowMap_` / `mergeExistingRow_` をそのまま移植し、workerd（ローカル実行環境）上で実行して`performance.now()`で計測した。既存行との突き合わせ（`buildExistingRowMap_`）に使うダミーデータ生成コストは実運用に存在しない（実際はDBからの読み込みでI/Oバウンド）ため、計測結果から除外して集計している。

| CSV行数 | 既存データ行数 | parseCsv | buildExistingRowMap | dedupe+merge | 実運用相当のCPU時間合計 |
|---|---|---|---|---|---|
| 2,000 | 3,000 | 4ms | 1ms | 0ms | **5ms** |
| 5,000 | 8,000 | 5ms | 1ms | 2ms | **8ms** |
| 20,000 | 20,000 | 13ms | 6ms | 2ms | **21ms** |

**Cloudflare Workers無料プランのCPU時間制限は10ms/リクエスト**（有料プランは30秒〜最大5分）。

- 2,000〜5,000行程度（月1回のCSVインポートを数ヶ月分まとめて、くらいの規模）は無料枠に収まる
- 20,000行規模（数年分をまとめてインポート等）は**無料枠を超える**

### 対応方針

現在のGAS実装（`Utilities.newBlob`でのShift-JISデコード＋サーバー側`parseCsv`）は、Workersに移した場合そのままではCPU時間制限に引っかかる可能性がある構成である。**CSVのパースをブラウザ側（クライアントサイド）で行い、Workersには構造化済みのJSONを送る設計に変更する**ことで、サーバー側のCPUコストをほぼゼロにできる（詳細は3番を参照）。既存行との突き合わせ（dedupe）も、JS側のMapループではなくSQLの`INSERT ... ON CONFLICT`（upsert）に置き換えれば、Workersが行うのはDBへのクエリ発行のみになり、CPU時間はほとんど消費しない。

## 3. CSVパースのクライアントサイド化・Shift-JISデコードの確認

検証コード: `migration-poc/shift-jis-check/`

workerd上で `new TextDecoder("shift_jis")` によるデコードが正しく行えることを確認した（`振込手数料`を含むテストバイト列で往復一致を確認）。ブラウザ（Chrome/Safari等）の`TextDecoder`もWHATWG Encoding Standardに準拠しており同様にShift-JISに対応しているため、**CSVパース自体をクライアントサイドに移しても、Shift-JISデコードで問題が出る可能性は低い**。

## 4. D1 + SQLでの集計クエリの確認

検証コード: `migration-poc/sql-queries/`

`raw_data`相当のテーブルをSQLite（D1ローカルエミュレーション）に作成し、5,000行のダミーデータを投入して、`handleSummary`/`handleTrend`相当のクエリを実行した。

- カテゴリ別支出内訳（`query-monthly-category-breakdown.sql`）: 正常に動作
- 月次合計（`query-monthly-totals.sql`）: 正常に動作
- 全期間の月次推移（`query-trend-monthly.sql`）: 正常に動作

いずれも標準的な`GROUP BY`/`CASE WHEN`で表現でき、GASの`getValues()`を全件読み込んでJS側でループ集計していた現行実装より、素直かつ高速になる見込み。

### 副次的な発見: D1の1ステートメント長制限

5,000行を1つの`INSERT`文にまとめようとしたところ `SQLITE_TOOBIG` エラーが発生した。**バルクインサートは200〜数百行単位のチャンクに分割する必要がある**（Phase 3のデータ移行スクリプト設計に反映する）。

## Phase 2以降への申し送り事項

1. **CSVアップロードはクライアントサイドパース + サーバーはJSON受け取り＋upsertのみ**という設計に変更する（Phase 5でエンドポイント設計時に反映）
2. **日付はISO 8601文字列（`YYYY-MM-DD`）で統一する**（Issue #217に記載の既存方針を維持。今回のPoCスキーマもこれに従っている）
3. **バルクinsertはチャンク分割前提で設計する**（Phase 3のデータ移行スクリプト）
4. 移行先（Cloudflare vs Fly.io/VPS等）は、コスト・運用の手間・移植性のどれを優先するかをユーザーと最終確認してから決定する
