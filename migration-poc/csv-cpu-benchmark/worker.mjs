// gas/csv.js の parseCsv 相当のロジックをそのまま移植し、workerd上でのCPU時間を計測する。
// 実際のSheet I/O（getRawDataSheet/getValues/setValues相当）はDBアクセスとしてI/Oバウンドになり
// Workersの「CPU時間」制限には（応答待ち中は）カウントされないため、ここでは計測しない。
// 計測対象は純粋なCPUバウンド処理（CSVパース＋既存行との突き合わせ）のみに絞る。
//
// 実行: npx wrangler dev migration-poc/csv-cpu-benchmark/worker.mjs --port 8791
// 計測: node migration-poc/csv-cpu-benchmark/run-benchmark.mjs

// ---- gas/csv.js からそのまま移植 ----
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
  const dataLines = lines.slice(1);
  const now = new Date().toISOString();

  return dataLines
    .map((line) => {
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
    })
    .filter((row) => row.id !== "");
}

function buildExistingRowMap_(data) {
  const map = new Map();
  data.forEach((row, index) => {
    map.set(row[0], {
      rowIndex: index,
      category: row[5],
      subcategory: row[6],
      memo: row[7],
      categoryLocked: row[12] === true,
    });
  });
  return map;
}

function mergeExistingRow_(existing, csvRow) {
  const category = csvRow.category !== "" ? csvRow.category : existing.category;
  const subcategory = csvRow.subcategory !== "" ? csvRow.subcategory : existing.subcategory;
  const memo = csvRow.memo !== "" ? csvRow.memo : existing.memo;
  const changed = category !== existing.category || subcategory !== existing.subcategory || memo !== existing.memo;
  return { category, subcategory, memo, changed };
}
// ---- ここまで移植 ----

// 既存raw_data相当のダミー行を生成する（実運用でシートが育った状態を模す）
function buildDummyExistingData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push([`mf-id-existing-${i}`, "2020/01/01", "既存店舗", -1000, "楽天カード", "食費", "スーパー", "", 0, 1, "2020-01-01T00:00:00.000Z", "2020-01-01T00:00:00.000Z", false]);
  }
  return data;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const existingCount = Number(url.searchParams.get("existingCount") || "0");
    const csvText = await request.text();

    const t0 = performance.now();
    const rows = parseCsv(csvText);
    const t1 = performance.now();

    const existingData = buildDummyExistingData(existingCount);
    const t2 = performance.now();
    const rowMap = buildExistingRowMap_(existingData);
    const t3 = performance.now();

    // handleUploadと同じく、既存行の突き合わせ（上書き判定）を全件走査する
    let changedCount = 0;
    for (const csvRow of rows) {
      const existing = rowMap.get(csvRow.id);
      if (!existing || existing.categoryLocked) continue;
      const merged = mergeExistingRow_(existing, csvRow);
      if (merged.changed) changedCount++;
    }
    const t4 = performance.now();

    return Response.json({
      parsedRows: rows.length,
      existingRows: existingCount,
      changedCount,
      timingsMs: {
        parseCsv: t1 - t0,
        buildDummyExistingData: t2 - t1,
        buildExistingRowMap: t3 - t2,
        dedupeAndMerge: t4 - t3,
        total: t4 - t0,
      },
    });
  },
};
