# db/

移行後（[Issue #217](https://github.com/naka-koma/flowrite/issues/217) Phase 2、[Issue #221](https://github.com/naka-koma/flowrite/issues/221)）のDBスキーマ定義。Drizzle ORMを使う。

## 構成

- `schema.ts` — テーブル定義。既存スプレッドシートの各シート（`gas/spreadsheet.js`参照）に1対1で対応する
- `drizzle.config.ts` — drizzle-kitの設定
- `migrations/` — `schema.ts`から生成したSQLマイグレーション（`npm run db:generate`で生成、手動編集しない）
- `verify-local.mts` — ローカル検証スクリプト。PGlite（WASM版Postgres）にマイグレーションを適用し、代表的なクエリ（月次集計・`categoryLocked`絞り込み・jsonb・複合主キー制約）が正しく動くかを確認する。実DBへの接続は不要
- `migrate-from-sheets/` — 既存スプレッドシートからのデータ移行スクリプト（[Issue #223](https://github.com/naka-koma/flowrite/issues/223)、詳細は同ディレクトリのREADME参照）
- `tools/check-db.mts`（`npm run db:check`） — 実DBの中身を素早く確認するユーティリティ。スプレッドシートを目視確認できなくなる代わり

## 使い方

```bash
# schema.tsを変更したらマイグレーションを再生成する
npm run db:generate

# ローカルで動作確認する（PGlite、アカウント登録不要）
npm run db:verify

# 実DBの中身を確認する
DATABASE_URL="postgres://..." npm run db:check
```

## 型の方針

日付・真偽値はDBのネイティブ型（`date`/`timestamp`/`boolean`）を使う。GAS版で「文字列で統一する」という回避策を取っていたのは、スプレッドシート側が文字列を勝手にDate型へ自動変換してしまう問題への対処（[Issue #212](https://github.com/naka-koma/flowrite/issues/212)で実際に発生）だったため。スキーマが明示的なSQL DBでは同じ問題は起きないため、ここでは採用していない。

ただし、APIレスポンス（JSON）としてクライアントへ返す際の日付表現は、フロントエンドとの取り決めとしてISO 8601文字列に統一する（DBの型とAPIのワイヤーフォーマットは別レイヤーとして扱う）。

## `ai_chat_session`のJSON列について

GAS版では`messagesJson`のように文字列としてJSONを保存し、読み書きのたびにパース・シリアライズしていたが、Postgresのネイティブ`jsonb`型に変更した（`messages`/`history`/`quickReplies`/`todoActions`/`categorySuggestions`）。パース・シリアライズをDB層に任せられる。

## まだ決めていないこと

- 実際の接続先（Neon等）は`migration-poc/findings.md`を参照。ここでは接続先を問わない標準的なPostgresスキーマとして定義している
- マイグレーションの実DBへの適用は、Phase 3（データ移行）で実施する
