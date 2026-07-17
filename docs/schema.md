# スプレッドシートスキーマ

## シート一覧

| シート名 | 用途 |
|---|---|
| raw_data | CSVから取り込んだ全トランザクションの蓄積 |
| ai_log | Gemini APIへのリクエスト・レスポンスの記録 |
| settings | AIアドバイスのプロンプト・使用モデルなどのキー・バリュー設定 |
| categories | 大項目・中項目のカテゴリマスタ |
| budgets | 大項目別の月間予算 |
| ai_attributes | ユーザー属性情報 |
| ai_memory | AIメモリ（気づき・傾向、分類パターン） |

---

## raw_data シート

### カラム定義

| 列 | カラム名 | 型 | 説明 |
|---|---|---|---|
| A | id | string | MoneyForwardのユニークID（重複排除キー） |
| B | date | string | 日付（YYYY/MM/DD形式） |
| C | content | string | 内容（店舗名・サービス名） |
| D | amount | number | 金額（支出は負値、収入は正値） |
| E | institution | string | 保有金融機関名 |
| F | category | string | 大項目 |
| G | subcategory | string | 中項目 |
| H | memo | string | メモ（空文字の場合あり） |
| I | isTransfer | number | 振替フラグ（1=振替、0=通常） |
| J | isTarget | number | 計算対象フラグ（1=対象、0=除外） |
| K | importedAt | string | 初回取り込み日時（ISO 8601形式）。以後のCSV再取込・手動編集でも更新しない |
| L | updatedAt | string | 最終更新日時（ISO 8601形式）。CSV再取込による上書き・取引一覧画面での手動編集のいずれでも更新する |
| M | categoryLocked | boolean | カテゴリ上書き保護フラグ。AI分類提案の適用時は自動的にtrueになる。取引一覧画面での手動編集（`handleUpdateCategory`）でも明示的にtrue/falseを指定できる（省略時false） |

### インデックス
- A列（id）で重複排除を行う。アップロード時に既存IDと照合し、未登録なら新規追加、既存であればcategory/subcategory/memoのみ更新対象にする（詳細は下記「CSV再取込」を参照）

### 注意
- 1行目はヘッダー行とする
- `amount` は元のCSVの符号をそのまま保持する（支出は負値）
- 集計時は `isTarget=1` かつ `isTransfer=0` の行のみ対象とする

### CSV再取込時の挙動
- 同一idの行がすでに存在する場合、`handleUpload`の`overwriteCategory`（デフォルト`true`）がオンであれば、category/subcategory/memoのうちCSV側の値が空でない項目のみ既存値を上書きする（空の場合は既存値を保持する）。オフの場合は既存値を一切変更しない
- 取引一覧画面からの手動編集（`handleUpdateCategory`）とCSV再取込のどちらでも`updatedAt`を更新する。手動編集した内容は、次回同一idのCSVが再取込された際に（`overwriteCategory`がオンかつCSV側の値が空でなければ）上書きされる
- `categoryLocked`が`true`の行は、`overwriteCategory`の設定に関わらずcategory/subcategory/memoを一切上書きしない

---

## ai_log シート

### カラム定義

| 列 | カラム名 | 型 | 説明 |
|---|---|---|---|
| A | timestamp | string | リクエスト日時（ISO 8601形式） |
| B | context | string | Geminiに渡したコンテキスト |
| C | advice | string | Geminiから返ってきたアドバイス |

### 注意
- 1行目はヘッダー行とする
- ログは追記のみ。削除・更新は行わない

---

## settings シート

### カラム定義

| 列 | カラム名 | 型 | 説明 |
|---|---|---|---|
| A | key | string | 設定キー |
| B | value | string | 設定値 |

### 使用するキー

| key | 説明 | 未設定時の挙動 |
|---|---|---|
| prompt | AIアドバイスのプロンプトテンプレート | GAS内蔵のデフォルトプロンプトを使う |
| model | 使用するGeminiモデル名 | `gemini-3.5-flash` → `gemini-3.1-flash-lite` の順に自動フォールバック |
| agendaTopics | ユーザーが関心を持ちやすいテーマの参考情報（改行区切り）。`handleGetAiFocusPoints`が「気になる点」を生成する際のヒントとしてプロンプトに注入する | デフォルト4テーマ（「今月のざっくり振り返り」など）を使う |

### 注意
- 1行目はヘッダー行とする
- 1キーにつき1行。同じキーで更新する場合は既存行の値を上書きする

---

## categories シート

### カラム定義

| 列 | カラム名 | 型 | 説明 |
|---|---|---|---|
| A | category | string | 大項目 |
| B | subcategory | string | 中項目 |

### 注意
- 1行目はヘッダー行とする
- (大項目, 中項目) のペアで1行。同じペアは重複して追加しない
- CSV取込時、未登録のペアがあれば自動的に追加される。設定画面や取引一覧画面から手動で追加することもできる
- 設定画面のカテゴリ設定では、(大項目, 中項目) ペア単位でのリネーム・削除（`handleUpdateCategoryPair`/`handleDeleteCategoryPair`。該当する1行のみを変更）と、大項目単位の一括リネーム・削除（`handleRenameCategory`/`handleDeleteCategory`。同じ大項目を持つ全行をまとめて変更）の両方に対応する
  - 大項目単位の一括リネーム・削除は、対応する`budgets`シートの予算行も追従して更新・削除する。ペア単位の操作は`budgets`シートに影響しない（大項目名自体は変わらないか、もしくは対象の大項目に他の行が残るため）
  - **`raw_data`（過去の取引データ）はどちらの操作でも更新しない**。リネーム・削除後も過去の取引は旧カテゴリー名のまま残り、実績集計上は新旧で別カテゴリとして扱われる（意図的な仕様）

---

## budgets シート（大項目別の月間予算）

### カラム定義

| 列 | カラム名 | 型 | 説明 |
|---|---|---|---|
| A | category | string | 大項目 |
| B | monthlyBudget | number | 月間予算額 |

### 注意
- 1行目はヘッダー行とする
- 予算は**大項目単位のみ**。中項目単位の予算は設定しない
- 1大項目につき1行。同じ大項目で追加・更新する場合は既存行の値を上書きする
- `categories`シートに存在しない大項目名でも予算を追加できる。その場合、(category, "未分類")のペアが`categories`シートに自動追加される（「未分類」は取引データとは紐づかない仮のプレースホルダー）
- `categories`シートで大項目がリネーム・削除された場合、対応する行も追従して更新・削除される

---

## ai_attributes シート（ユーザー属性情報）

### カラム定義

| 列 | カラム名 | 型 | 説明 |
|---|---|---|---|
| A | id | string | 属性の一意なID（UUID。追加時にGAS側で生成する） |
| B | key | string | 属性の項目名（例: `ワークスタイル`） |
| C | value | string | 属性の内容（例: `在宅リモートワーク中心`） |

### 注意
- 1行目はヘッダー行とする
- 1属性につき1行。`id`で行を識別するため、`key`を変更しても同一の属性として扱える
- Keyの重複は禁止しない（IDで一意に識別するため）
- AIアドバイス取得時、登録されているすべての属性がプロンプトの先頭セクションに結合される

---

## ai_memory シート（AIメモリ）

### カラム定義

| 列 | カラム名 | 型 | 説明 |
|---|---|---|---|
| A | id | string | メモリの一意なID（UUID。追加時にGAS側で生成する） |
| B | type | string | `insight`（気づき・傾向） or `categoryPattern`（分類パターン） |
| C | content | string | insight: 気づきの本文。categoryPattern: 元になった取引の内容・金融機関などの参考テキスト |
| D | category | string | categoryPatternのみ使用。学習した大項目（insightでは空文字） |
| E | subcategory | string | categoryPatternのみ使用。学習した中項目（insightでは空文字） |
| F | createdAt | string | 作成日時（ISO 8601形式。追加時にGAS側で設定する） |

### 注意
- 1行目はヘッダー行とする
- 1メモリにつき1行。追加は常にユーザーの明示操作（AIアドバイスの「覚えておく」ボタン、AI分類提案の「記憶する」チェック）からのみ行われる。AIによる自動生成・自動保存は行わない
- `type=insight`はAIアドバイス取得時（`handleGetAiFocusPoints`/`handleStartAiChat`）にプロンプトへ「過去の気づき・傾向」として注入される
- `type=categoryPattern`はAI分類提案（`handleGetAiCategorySuggestions`）のプロンプトへ参考例として注入される。完全一致する場合でもGemini呼び出しはスキップしない
- 更新（値の書き換え）は行わない。内容を変えたい場合は削除して追加し直す
