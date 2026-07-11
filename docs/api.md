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

指定月の大項目別支出合計を返す。

**引数**

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| year | number | ✓ | 年（例: 2025） |
| month | number | ✓ | 月（例: 12） |

**戻り値**
```js
{
  "year": 2025,
  "month": 12,
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

**注意**
- `total` は支出を正の値で返す（マイナス符号なし）
- `計算対象=0` の行は集計から除外する
- `振替=1` の行は集計から除外する
- `transactions` は該当カテゴリー・該当月の取引明細（日付昇順）。`amount` は支出を正の値で返す

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
- 使用するモデルはスクリプトプロパティ `GEMINI_MODEL`（任意）で固定できる。未設定の場合は `gemini-3.5-flash` → `gemini-3.1-flash-lite` の順に試し、クォータ超過（429）・一時的な高負荷（503）時のみ次のモデルにフォールバックする
