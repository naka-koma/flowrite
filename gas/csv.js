function buildExistingRowMap_(data) {
  const map = new Map();
  data.forEach((row, index) => {
    map.set(row[0], { rowIndex: index, category: row[5], subcategory: row[6], memo: row[7] });
  });
  return map;
}

// CSV側が空でない項目のみ既存値を上書きする（部分的な保護）
function mergeExistingRow_(existing, csvRow) {
  const category = csvRow.category !== "" ? csvRow.category : existing.category;
  const subcategory = csvRow.subcategory !== "" ? csvRow.subcategory : existing.subcategory;
  const memo = csvRow.memo !== "" ? csvRow.memo : existing.memo;
  const changed = category !== existing.category || subcategory !== existing.subcategory || memo !== existing.memo;
  return { category, subcategory, memo, changed };
}

function applyExistingRowUpdates_(sheet, data, rowMap, csvRows, now) {
  let updatedCount = 0;

  for (const csvRow of csvRows) {
    const existing = rowMap.get(csvRow.id);
    if (!existing) continue;

    const merged = mergeExistingRow_(existing, csvRow);
    if (!merged.changed) continue;

    data[existing.rowIndex][5] = merged.category;
    data[existing.rowIndex][6] = merged.subcategory;
    data[existing.rowIndex][7] = merged.memo;
    data[existing.rowIndex][11] = now;
    updatedCount++;
  }

  if (updatedCount > 0) {
    // F:H(category/subcategory/memo) + L(updatedAt) をまとめて1回のbulk writeで反映する
    const categorySubcategoryMemo = data.map((row) => [row[5], row[6], row[7]]);
    const updatedAt = data.map((row) => [row[11]]);
    sheet.getRange(2, 6, data.length, 3).setValues(categorySubcategoryMemo);
    sheet.getRange(2, 12, data.length, 1).setValues(updatedAt);
  }

  return updatedCount;
}

function collectNewCategoryPairs_(rows, existingPairs) {
  const seen = new Set();
  const newPairs = [];

  for (const row of rows) {
    if (!row.category || !row.subcategory) continue;
    const key = `${row.category} ${row.subcategory}`;
    if (existingPairs.has(key) || seen.has(key)) continue;
    seen.add(key);
    newPairs.push({ category: row.category, subcategory: row.subcategory });
  }

  return newPairs;
}

function handleUpload(body) {
  const base64 = body.csv;
  if (!base64) {
    return { success: false, error: "csv field is required" };
  }

  const decoded = Utilities.newBlob(Utilities.base64Decode(base64), "application/octet-stream")
    .getDataAsString("Shift_JIS");

  const rows = parseCsv(decoded);
  Logger.log(`Parsed ${rows.length} rows from CSV`);

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  const data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 12).getValues() : [];
  const rowMap = buildExistingRowMap_(data);

  const newRows = rows.filter((row) => !rowMap.has(row.id));
  const skipped = rows.length - newRows.length;
  const now = new Date().toISOString();

  applyExistingRowUpdates_(sheet, data, rowMap, rows, now);

  if (newRows.length > 0) {
    appendRows(sheet, newRows.map((row) => ({ ...row, updatedAt: row.importedAt })));
  }

  const categoriesSheet = getCategoriesSheet();
  const existingPairs = getExistingCategoryPairs(categoriesSheet);
  const newPairs = collectNewCategoryPairs_(rows, existingPairs);
  if (newPairs.length > 0) {
    appendCategoryPairs(categoriesSheet, newPairs);
  }

  Logger.log(`Inserted: ${newRows.length}, Skipped: ${skipped}`);
  return { success: true, inserted: newRows.length, skipped };
}

function parseCsvLine(line) {
  const cols = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cols.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cols.push(current);

  return cols;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  // 1行目はヘッダー、スキップ
  const dataLines = lines.slice(1);
  const now = new Date().toISOString();

  return dataLines.map((line) => {
    const cols = parseCsvLine(line);
    return {
      id: cols[9] || "",
      date: cols[1] || "",
      content: cols[2] || "",
      amount: Number(cols[3]) || 0,
      institution: cols[4] || "",
      category: cols[5] || "",
      subcategory: cols[6] || "",
      memo: cols[7] || "",
      isTransfer: Number(cols[8]) || 0,
      isTarget: Number(cols[0]) || 0,
      importedAt: now,
    };
  }).filter((row) => row.id !== "");
}
