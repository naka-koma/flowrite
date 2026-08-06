// マネーフォワードME側への書き戻し対象（前回の同期チェックポイント以降に
// カテゴリ等が変更された取引）を抽出する機能。
// 実際のマネーフォワードME画面への書き戻し操作（ブラウザ自動化・手動操作）は対象外。
// あくまで「差分の出力」と「チェックポイントの管理」のみを担う（Issue #212）。

const MF_SYNC_CHECKPOINT_KEY = "lastMfSyncAt";

// categoryLocked=true（AI分類提案の適用・手動編集のいずれかで実際にカテゴリが
// 変更された行のみtrueになる）かつ、updatedAtがチェックポイントより後の行を、
// マネーフォワードME側で該当取引を特定するための項目（日付・内容・金額・金融機関）と、
// 書き込む値（大項目・中項目）に絞って返す。
// categoryLockedの条件を入れないと、チェックポイント未設定時（初回実行時）に
// 一度も手動で分類していない取引まで含めraw_data全件が対象になってしまう
// （CSV取込時にもupdatedAtがimportedAtと同時にセットされるため）
function handleGetMfSyncDiff() {
  const checkpoint = getSettingsMap_()[MF_SYNC_CHECKPOINT_KEY] || "";
  const checkpointTime = checkpoint ? new Date(checkpoint).getTime() : 0;

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, rows: [], checkpoint };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const tz = Session.getScriptTimeZone();

  const rows = data
    // M列: categoryLocked, L列: updatedAt。
    // 日付風の文字列を書き込んだセルはスプレッドシート側で実際のDate型に自動変換されることがあるため、
    // row[11]をnew Date()で明示的に解釈してから比較する（文字列同士の単純比較には頼らない）
    .filter((row) => row[12] === true && new Date(row[11]).getTime() > checkpointTime)
    .map((row) => ({
      // row[1]（日付）も同様にDate型化されている場合があるため、常に文字列へ整形して返す。
      // google.script.runは配列内に複数のDateオブジェクトが混在すると応答のシリアライズに失敗し
      // クライアント側でnullが返ってくることがあるため、返却する値は必ずプリミティブに揃える
      date: Utilities.formatDate(new Date(row[1]), tz, "yyyy/MM/dd"),
      content: String(row[2]),
      amount: Number(row[3]),
      institution: String(row[4]),
      category: String(row[5]),
      subcategory: String(row[6]),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  Logger.log(`handleGetMfSyncDiff: checkpoint=${checkpoint} rows=${rows.length}`);

  return { success: true, rows, checkpoint };
}

// 書き戻し作業（マネーフォワードME側の手動操作等）が完了したことを記録する。
// 以後handleGetMfSyncDiffは、この時刻より後にupdatedAtが更新された行のみを対象にする
function handleCompleteMfSync() {
  const syncedAt = new Date().toISOString();
  setSetting_(MF_SYNC_CHECKPOINT_KEY, syncedAt);
  return { success: true, syncedAt };
}
