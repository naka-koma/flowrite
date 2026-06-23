# API仕様

GAS WebApp のエンドポイント仕様。フロントエンドは `fetch` で同一オリジンの `?action=xxx` にリクエストする。

## 共通

- ベースURL: GAS WebApp の公開URL（環境ごとに異なる）
- レスポンス形式: `Content-Type: application/json`
- エラー時は `{ "success": false, "error": "<メッセージ>" }` を返す

---

## POST `?action=upload`

CSVファイルをアップロードして `raw_data` シートに追記する。

**リクエストボディ**
```json
{
  "csv": "<Base64エンコードされたCSVデータ（Shift-JIS）>"
}
```

**レスポンス**
```json
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

## GET `?action=summary&year=YYYY&month=M`

指定月の大項目別支出合計を返す。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| year | number | ✓ | 年（例: 2025） |
| month | number | ✓ | 月（例: 12） |

**レスポンス**
```json
{
  "year": 2025,
  "month": 12,
  "totalExpense": 185000,
  "totalIncome": 320000,
  "categories": [
    { "name": "食費", "total": 35000 },
    { "name": "交通費", "total": 12000 },
    { "name": "住居", "total": 66000 }
  ]
}
```

**注意**
- `total` は支出を正の値で返す（マイナス符号なし）
- `計算対象=0` の行は集計から除外する
- `振替=1` の行は集計から除外する

---

## GET `?action=trend`

全蓄積期間の月次支出合計を返す。

**レスポンス**
```json
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

## POST `?action=ai-advice`

支出データをGemini APIに渡してアドバイスを返す。

**リクエストボディ**
```json
{
  "context": "<月次サマリーや全体トレンドをまとめたテキストまたはJSON文字列>"
}
```

**レスポンス**
```json
{
  "success": true,
  "advice": "食費が先月比15%増加しています。外食の頻度を見直すと節約につながります。"
}
```

**注意**
- `context` の内容はフロントエンド側で組み立てる
- Gemini APIキーは GAS スクリプトプロパティ `GEMINI_API_KEY` から取得する
- レスポンスのログは `ai_log` シートに保存する（日時・context・advice）
