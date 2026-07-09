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
  const existingIds = getExistingIds(sheet);

  const newRows = rows.filter((row) => !existingIds.has(row.id));
  const skipped = rows.length - newRows.length;

  if (newRows.length > 0) {
    appendRows(sheet, newRows);
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
