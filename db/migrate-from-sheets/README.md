# db/migrate-from-sheets/

既存スプレッドシートの実データを、新DB（`db/schema.ts`）へ移行するためのスクリプト（[Issue #223](https://github.com/naka-koma/flowrite/issues/223)、[#217](https://github.com/naka-koma/flowrite/issues/217)のPhase 3）。

## 構成

- `transform.mjs` — エクスポートJSON（`gas/migrationExport.js`の出力）を`db/schema.ts`のinsert形式に変換する純粋関数群。日付表記ゆれ（`2026/06/03` / `2026-06-03`）、`categoryLocked`の型ゆれ（`true` / `"FALSE"` / `""`）を吸収する
- `load.mts` — 変換済みデータをDrizzleのdbインスタンスへチャンク分割してinsertする（PGlite/Neonどちらでも同じ関数が使える）
- `run.mts` — 上記2つをまとめて実行するCLIスクリプト
- `verify.mts` — `fixtures/sample-export.json`（エッジケースを含む合成データ）を使い、変換結果とDB投入後の値を検証する
- `fixtures/sample-export.json` — テスト用の合成データ。**本番データは含まない**

## 使い方

### 1. スプレッドシートからエクスポートする

スプレッドシートのメニュー「flowrite管理 > 全データエクスポート（DB移行用）」を実行する（`gas/migrationExport.js`）。新しいシートにJSONが書き出されるので、その内容をファイルとして保存する。

### 2. ローカルで動作確認する（アカウント登録不要）

```bash
npx tsx db/migrate-from-sheets/run.mts --input path/to/export.json
```

`DATABASE_URL`を指定しない場合、PGlite（使い捨てのローカルDB）に投入して件数を確認するだけで、どこにも永続化されない。

### 3. 実際のDBへ投入する（本番移行時）

```bash
DATABASE_URL="postgres://..." npx tsx db/migrate-from-sheets/run.mts --input path/to/export.json
```

## 検証

```bash
npm run db:migrate:verify
```

合成データ（`fixtures/sample-export.json`）を使い、以下を確認する。

- 日付表記ゆれ（スラッシュ区切り/ISO形式）の正規化
- `categoryLocked`の型ゆれ（真偽値/文字列/空文字）の正規化
- DB投入後、`categoryLocked=true`の行だけを正しく抽出できること（#212のMF書き戻しロジックが新DBでも成立するかの確認を兼ねる）
- `decisions`テーブルのnullable列（`beforeAmount`）の扱い

## まだやっていないこと

- 実データでの本番移行（Neonアカウント作成後に実施）
- 移行後の件数突き合わせ・切り戻し手順の実地確認
