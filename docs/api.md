# API仕様

GAS WebAppの関数仕様。フロントエンドは `google.script.run` 経由でGAS側のグローバル関数を直接呼び出す。

## 共通

- GAS WebAppはHtmlServiceのサンドボックスiframe内で描画されるため、`fetch` によるdoGet/doPost呼び出しはCORSでブロックされる（`ContentService` はCORSヘッダーを設定できない仕様のため）。そのため通常のREST風APIは使えず、`google.script.run` を使う
- フロントエンドからは `frontend/src/lib/googleScriptRun.ts` の `runScript<T>(functionName, ...args)` ヘルパーを介して呼び出す
- 各関数はエラー時 `{ "success": false, "error": "<メッセージ>" }`、または `error` フィールドを含むオブジェクトを返す

---

## `handleUpload(body)`

CSVファイルをアップロードして `raw_data` シートに追記する。

**引数**
```js
{
  "csv": "<Base64エンコードされたCSVデータ（Shift-JIS）>"
}
```

**戻り値**
```js
{
  "success": true,
  "inserted": 42,
  "skipped": 5
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| inserted | number | 新規追加した行数 |
| skipped | number | 重複のためスキップした行数 |

---

## `handleSummary(params)`

指定期間（月・年・週）の大項目別支出合計を返す。

**引数**

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| unit | `"month" \| "year" \| "week"` | - | 集計単位。省略時は `"month"` |
| year | number | unit=month/year で必須 | 年（例: 2025） |
| month | number | unit=month で必須 | 月（例: 12） |
| weekStart | string | unit=week で必須 | 週の開始日（月曜日、`YYYY-MM-DD`形式） |

週は**月曜始まり**（月〜日の7日間）。`weekStart` にはその週の月曜日の日付を渡す。

**戻り値**
```js
{
  "unit": "month",
  "year": 2025,
  "month": 12,
  "label": "2025年12月",
  "totalExpense": 185000,
  "totalIncome": 320000,
  "categories": [
    {
      "name": "食費",
      "total": 35000,
      "transactions": [
        { "content": "スーパー", "date": "2025/12/01", "amount": 3000 },
        { "content": "コンビニ", "date": "2025/12/03", "amount": 500 }
      ]
    },
    { "name": "交通費", "total": 12000, "transactions": [ /* ... */ ] },
    { "name": "住居", "total": 66000, "transactions": [ /* ... */ ] }
  ]
}
```

`unit` が `"year"` の場合 `month` は含まれず、`label` は `"2025年"` のような形式になる。`unit` が `"week"` の場合も `month` は含まれず、`label` は `"2025/12/01 〜 2025/12/07"` のような形式になる。

**注意**
- `total` は支出を正の値で返す（マイナス符号なし）
- `計算対象=0` の行は集計から除外する
- `振替=1` の行は集計から除外する
- `transactions` は該当カテゴリー・該当期間の取引明細（日付昇順）。`amount` は支出を正の値で返す

---

## `handleTrend()`

全蓄積期間の月次支出合計を返す。引数なし。

**戻り値**
```js
{
  "months": [
    { "year": 2025, "month": 10, "totalExpense": 180000, "totalIncome": 320000 },
    { "year": 2025, "month": 11, "totalExpense": 210000, "totalIncome": 320000 },
    { "year": 2025, "month": 12, "totalExpense": 185000, "totalIncome": 320000 }
  ]
}
```

月は昇順で返す。

---

## `handleAiAdvice(body)`

支出データをGemini APIに渡してアドバイスを返す。

**引数**
```js
{
  "context": "<月次サマリーや全体トレンドをまとめたテキストまたはJSON文字列>"
}
```

**戻り値**
```js
{
  "success": true,
  "advice": "食費が先月比15%増加しています。外食の頻度を見直すと節約につながります。"
}
```

**注意**
- `context` の内容はフロントエンド側で組み立てる
- Gemini APIキーは GAS スクリプトプロパティ `GEMINI_API_KEY` から取得する
- レスポンスのログは `ai_log` シートに保存する（日時・context・advice）
- プロンプトのテンプレートは `settings` シートの `prompt` キーで変更できる（`handleUpdateSettings` 参照）。未設定時はGAS内蔵のデフォルトプロンプトを使う
- 使用するモデルは `settings` シートの `model` キー、またはスクリプトプロパティ `GEMINI_MODEL`（`settings`未設定時のみ参照）で固定できる。いずれも未設定の場合は `gemini-3.5-flash` → `gemini-3.1-flash-lite` の順に試し、クォータ超過（429）・一時的な高負荷（503）時のみ次のモデルにフォールバックする

---

## `handleGetSettings()`

AIアドバイスのプロンプト・使用モデル設定を返す。引数なし。

**戻り値**
```js
{
  "prompt": "あなたは家計管理のアドバイザーです。以下の支出データを分析し、具体的で実行可能なアドバイスを日本語で提供してください。",
  "model": ""
}
```

**注意**
- 未設定の場合、`prompt` はGAS内蔵のデフォルト文言、`model` は空文字列（自動フォールバックを使う意味）を返す

---

## `handleUpdateSettings(settings)`

AIアドバイスのプロンプト・使用モデル設定を更新する。

**引数**
```js
{
  "prompt": "<プロンプトテンプレート>",
  "model": "<Geminiモデル名（空文字で自動フォールバックに戻す）>"
}
```

**戻り値**
```js
{ "success": true }
```

**注意**
- `prompt` を空文字で保存すると、次回以降デフォルトのプロンプトにフォールバックする
- `model` を空文字で保存すると、次回以降 `gemini-3.5-flash` → `gemini-3.1-flash-lite` の自動フォールバックに戻る

---

## `handleRunMigrations()`

未適用のスプレッドシートマイグレーション（`gas/migration.js` の `MIGRATIONS` 配列）を順に実行する。引数なし。

**戻り値**
```js
{
  "results": [
    {
      "id": "001_normalize_raw_data_amount",
      "description": "raw_dataのamount列に残っている文字列（クォート・カンマ付き）を数値に正規化する",
      "success": true,
      "result": { "updated": 3 }
    }
  ],
  "appliedCount": 1
}
```

**注意**
- 適用済みマイグレーションIDは `PropertiesService`（スクリプトプロパティ `APPLIED_MIGRATIONS`）にJSON配列として記録し、二重適用を防ぐ
- マイグレーションは配列の順に実行し、いずれかが失敗した場合はそこで停止する（失敗したマイグレーションは適用済みとして記録しないため、次回実行時に再試行される）
- スプレッドシートのカスタムメニュー「flowrite管理 > マイグレーション実行」からも同じ処理を実行できる（実行前に確認ダイアログを表示する）
