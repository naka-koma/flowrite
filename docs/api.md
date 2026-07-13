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
| skipped | number | 既存id行として扱った件数（category/subcategory/memoの上書き対象。詳細は下記「既存id行の扱い」を参照） |

**注意**
- 未登録のidは新規行として追加する（`importedAt`/`updatedAt`とも取込日時）
- 既存idの行はcategory/subcategory/memoのうちCSV側の値が空でない項目のみ上書きし、`updatedAt`を更新する（空の場合は既存値を保持する）。date/amount/institutionなどその他の列は変更しない
- 取込んだCSVに含まれる(大項目, 中項目)のペアで `categories` シートに未登録のものがあれば自動的に追加する

---

## `handleSummary(params)`

指定期間（月・年・週）の大項目別支出合計を返す。

**引数**

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| unit | `"month" \| "year" \| "week" \| "all"` | - | 集計単位。省略時は `"month"` |
| year | number | unit=month/year で必須 | 年（例: 2025） |
| month | number | unit=month で必須 | 月（例: 12） |
| weekStart | string | unit=week で必須 | 週の開始日（月曜日、`YYYY-MM-DD`形式） |

`unit` が `"all"` の場合、`year`/`month`/`weekStart` は不要（`raw_data`の全期間を対象に集計する）。

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
  ],
  "incomeCategories": [
    { "name": "給与", "total": 300000, "transactions": [ /* ... */ ] },
    { "name": "一時所得", "total": 20000, "transactions": [ /* ... */ ] }
  ],
  "comparison": {
    "previousMonth": {
      "label": "2025年11月",
      "totalExpense": 210000,
      "totalIncome": 320000,
      "balance": 110000,
      "expenseDiff": -25000,
      "incomeDiff": 0,
      "balanceDiff": 25000
    },
    "previousYear": {
      "label": "2024年12月",
      "totalExpense": 170000,
      "totalIncome": 300000,
      "balance": 130000,
      "expenseDiff": 15000,
      "incomeDiff": 20000,
      "balanceDiff": 5000
    }
  }
}
```

`unit` が `"year"` の場合 `month` は含まれず、`label` は `"2025年"` のような形式になる。`unit` が `"week"` の場合も `month` は含まれず、`label` は `"2025/12/01 〜 2025/12/07"` のような形式になる。`unit` が `"all"` の場合 `year`/`month` は含まれず、`label` は `"全期間"` になる。

**注意**
- `total` は支出・収入とも正の値で返す（マイナス符号なし）
- `計算対象=0` の行は集計から除外する
- `振替=1` の行は集計から除外する
- `categories` は大項目別の支出内訳、`incomeCategories` は大項目別の収入内訳。`transactions` は該当カテゴリー・該当期間の取引明細（日付昇順）
- `comparison`（前月・前年同月比較）は `unit === "month"` の場合のみ含まれる。`year`/`week` では省略される
  - `*Diff` フィールドは `現在の値 - 比較対象の値`（支出が減った場合は負の値になる）

---

## `handleTrend(params)`

指定した集計単位（月/年/週）で、全蓄積期間の推移データを返す。

**引数**

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| unit | `"month" \| "year" \| "week"` | - | 集計単位。省略時は `"month"` |

**戻り値**
```js
{
  "unit": "month",
  "points": [
    { "label": "2025/10", "totalExpense": 180000, "totalIncome": 320000 },
    { "label": "2025/11", "totalExpense": 210000, "totalIncome": 320000 },
    { "label": "2025/12", "totalExpense": 185000, "totalIncome": 320000 }
  ]
}
```

`points` は昇順（過去→現在）で返す。`unit` が `"year"` の場合 `label` は `"2025年"`、`"week"` の場合は週の月曜日基準で `"MM/dd"` 形式になる。

---

## `handleMonthlyCalendar(params)`

指定した年月の日別収支（収入・支出・収支）とその月の合計を返す。

**引数**

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| year | number | ○ | 年（例: 2025） |
| month | number | ○ | 月（例: 12） |

**戻り値**
```js
{
  "year": 2025,
  "month": 12,
  "label": "2025年12月",
  "totalExpense": 185000,
  "totalIncome": 320000,
  "balance": 135000,
  "days": [
    { "date": "2025-12-01", "day": 1, "dayOfWeek": 1, "totalExpense": 3000, "totalIncome": 0, "balance": -3000 },
    { "date": "2025-12-02", "day": 2, "dayOfWeek": 2, "totalExpense": 0, "totalIncome": 0, "balance": 0 }
  ]
}
```

**注意**
- `days` はその月の全日（1日〜末日）を含む（取引が無い日も0円として含める）
- `dayOfWeek` は `Date.prototype.getDay()` と同じ（0=日曜〜6=土曜）
- `計算対象=0` の行、`振替=1` の行は集計から除外する（`handleSummary`と同様）

---

## `handleAiAdvice(body)`

指定期間の支出データをGAS側で集計し、Gemini APIに渡してアドバイスを返す。

**引数**
```js
{
  "unit": "month",
  "year": 2025,
  "month": 12
}
```

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| unit | `"month" \| "year" \| "all"` | - | 集計単位。省略時は `"month"` |
| year | number | unit=month/year で必須 | 年（例: 2025） |
| month | number | unit=month で必須 | 月（例: 12） |

内部で `handleSummary` と同じロジックで期間集計を行い、コンテキスト文をGAS側で組み立てる。

**戻り値**
```js
{
  "success": true,
  "advice": "食費が先月比15%増加しています。外食の頻度を見直すと節約につながります。"
}
```

**注意**
- コンテキストの組み立てはすべてGAS側で行う（フロントエンドは期間の指定のみ渡す）
- 指定期間に取引データが無い場合は `{ "success": false, "error": "指定した期間のデータがありません" }` を返す
- Gemini APIキーは GAS スクリプトプロパティ `GEMINI_API_KEY` から取得する
- レスポンスのログは `ai_log` シートに保存する（日時・GAS側で組み立てたcontext・advice）
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

## `handleGetPreferences()`

テーマ・ホーム画面レイアウト・トレンド表示件数を`PropertiesService.getUserProperties()`（実行しているGoogleアカウント単位）から取得する。引数なし。

**戻り値**
```js
{
  "theme": "mint-clarity",
  "dashboardLayout": "[{\"id\":\"upload\",\"visible\":true}, ...]",
  "trendVisibleCount": "12"
}
```

**注意**
- 各値は文字列で保存・返却される（`dashboardLayout`はJSON文字列）。フロントエンド側でパース・バリデーションを行う
- 未設定のキーは空文字を返す。フロントエンド側でデフォルト値にフォールバックする
- ブラウザのlocalStorageと異なり、Safari WebApp化した場合のITP等の影響を受けない

---

## `handleUpdatePreference(body)`

指定したキーの値をUserPropertiesに保存する。

**引数**
```js
{
  "key": "theme",
  "value": "indigo-mystery"
}
```

| プロパティ | 型 | 説明 |
|---|---|---|
| key | `"theme" \| "dashboardLayout" \| "trendVisibleCount"` | 保存先キー |
| value | string | 保存する値 |

**戻り値**
```js
{ "success": true }
```

**注意**
- `key` が許可されたキー以外の場合は `{ "success": false, "error": "invalid key" }` を返す

---

## `handleTransactionList(params)`

指定した年月の取引一覧をページ単位で返す。あわせてカテゴリ編集用のプルダウン選択肢も返す。

**引数**

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| year | number | ○ | 年（例: 2025） |
| month | number | ○ | 月（例: 12） |
| page | number | - | ページ番号（1始まり）。省略時は1 |
| pageSize | number | - | 1ページあたりの件数。省略時は50 |

**戻り値**
```js
{
  "transactions": [
    {
      "id": "abc123",
      "date": "2025/12/01",
      "content": "スーパー",
      "amount": -3000,
      "institution": "楽天カード",
      "category": "食費",
      "subcategory": "スーパー",
      "memo": ""
    }
  ],
  "totalCount": 42,
  "page": 1,
  "pageSize": 50,
  "categoryOptions": ["食費", "交通費", "住居"],
  "subcategoryOptionsByCategory": {
    "食費": ["外食", "スーパー", "コンビニ"],
    "交通費": ["電車", "バス"]
  }
}
```

**注意**
- `transactions` は日付昇順、`amount` は符号付き（支出は負値、収入は正値）で返す。表示時の絶対値変換はフロントエンド側で行う
- `categoryOptions` / `subcategoryOptionsByCategory` は `categories` シート（カテゴリマスタ）から取得する。`handleGetCategories` と同じデータソース
- `raw_data` が空、または該当月にデータがない場合は `transactions: []`, `totalCount: 0` を返す

---

## `handleUpdateCategory(body)`

取引1件の大項目・中項目・メモを更新し、`raw_data` シートに反映する。

**引数**
```js
{
  "id": "<MoneyForwardのユニークID>",
  "category": "<大項目>",
  "subcategory": "<中項目>",
  "memo": "<メモ>"
}
```

**戻り値**
```js
{ "success": true }
```

**注意**
- `id` は `raw_data` のA列（重複排除キー）と一致する行を探して更新する。一致する行がない場合は `{ "success": false, "error": "transaction not found" }` を返す
- 更新対象は大項目・中項目・メモのみ。日付・金額・内容などその他の列は変更しない。`updatedAt` を更新日時で上書きする
- ここで手動編集した内容は、次回同一idのCSVが再取込された際、CSV側の値が空でなければ上書きされる（`handleUpload`参照）

---

## `handleGetCategories()`

カテゴリマスタ（大項目→中項目一覧）を返す。引数なし。

**戻り値**
```js
{
  "categories": {
    "食費": ["外食", "スーパー", "コンビニ"],
    "交通費": ["電車", "バス"]
  }
}
```

---

## `handleAddCategory(body)`

カテゴリマスタに (大項目, 中項目) のペアを追加する。既に存在する場合は何もしない。

**引数**
```js
{
  "category": "<大項目>",
  "subcategory": "<中項目>"
}
```

**戻り値**
```js
{ "success": true }
```

**注意**
- `category` / `subcategory` が空文字の場合は `{ "success": false, "error": "category and subcategory are required" }` を返す

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
