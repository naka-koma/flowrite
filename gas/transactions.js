function handleTransactionList(params) {
  const year = Number(params.year);
  const month = Number(params.month);
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 50;

  if (!year || !month) {
    return { error: "year and month are required" };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const tz = Session.getScriptTimeZone();

  const { categories } = handleGetCategories();
  const categoryOptions = Object.keys(categories);
  const subcategoryOptionsByCategory = categories;

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      transactions: [],
      totalCount: 0,
      page,
      pageSize,
      categoryOptions,
      subcategoryOptionsByCategory,
    };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();

  const matched = [];
  for (const row of data) {
    const date = new Date(row[1]);
    if (date < start || date >= end) continue;

    matched.push({
      id: row[0],
      date: Utilities.formatDate(date, tz, "yyyy/MM/dd"),
      content: row[2],
      amount: row[3],
      institution: row[4],
      category: row[5],
      subcategory: row[6],
      memo: row[7],
      locked: row[12] === true,
    });
  }

  matched.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const totalCount = matched.length;
  const offset = (page - 1) * pageSize;
  const transactions = matched.slice(offset, offset + pageSize);

  return { transactions, totalCount, page, pageSize, categoryOptions, subcategoryOptionsByCategory };
}

function handleUpdateCategory(body) {
  const id = body.id;
  const category = body.category;
  const subcategory = body.subcategory;
  const memo = body.memo;
  const locked = !!body.locked;

  if (!id) {
    return { success: false, error: "id is required" };
  }

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: "transaction not found" };
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex((row) => row[0] === id);

  if (rowIndex === -1) {
    return { success: false, error: "transaction not found" };
  }

  const now = new Date().toISOString();
  sheet.getRange(rowIndex + 2, 6, 1, 3).setValues([[category, subcategory, memo]]);
  sheet.getRange(rowIndex + 2, 12, 1, 2).setValues([[now, locked]]);

  return { success: true };
}

// AI分類提案のうちユーザーが選択したものだけを一括反映する。
// 適用した行はcategoryLockedをtrueにし、以後のCSV再取込で上書きされないようにする
function handleApplyAiCategorySuggestions(body) {
  const suggestions = Array.isArray(body && body.suggestions) ? body.suggestions : [];
  if (suggestions.length === 0) {
    return { success: false, error: "suggestions is required" };
  }

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: "transaction not found" };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const rowIndexById = new Map();
  data.forEach((row, index) => rowIndexById.set(row[0], index));

  const now = new Date().toISOString();
  let applied = 0;
  let notFound = 0;

  for (const s of suggestions) {
    const rowIndex = rowIndexById.get(s.id);
    if (rowIndex === undefined) {
      notFound++;
      continue;
    }
    data[rowIndex][5] = s.category;
    data[rowIndex][6] = s.subcategory;
    data[rowIndex][11] = now;
    data[rowIndex][12] = true;
    applied++;
  }

  if (applied > 0) {
    const categorySubcategoryMemo = data.map((row) => [row[5], row[6], row[7]]);
    const updatedAtLocked = data.map((row) => [row[11], row[12]]);
    sheet.getRange(2, 6, data.length, 3).setValues(categorySubcategoryMemo);
    sheet.getRange(2, 12, data.length, 2).setValues(updatedAtLocked);
  }

  return { success: true, applied, notFound };
}

// AIが対話中に出した分類の見直し案（id・提案先category/subcategory・reasonのみ）を、
// 表示に必要な情報（現在の分類・金額・新規カテゴリかどうか）まで解決する。
// AIの出力を信用しすぎず、実データと突き合わせて補完することで、
// 存在しないidや古い分類情報に基づくハルシネーションを弾く
function resolveAiCategorySuggestions_(rawSuggestions) {
  if (!Array.isArray(rawSuggestions) || rawSuggestions.length === 0) {
    return [];
  }

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const rowById = new Map();
  data.forEach((row) => rowById.set(row[0], row));

  const { categories } = handleGetCategories();
  const existingPairKeys = new Set();
  Object.keys(categories).forEach((category) => {
    categories[category].forEach((subcategory) => existingPairKeys.add(`${category} ${subcategory}`));
  });

  const tz = Session.getScriptTimeZone();
  const resolved = [];

  for (const s of rawSuggestions) {
    const row = rowById.get(s.id);
    if (!row) continue; // 存在しないidは無視（ハルシネーション対策）

    const suggestedCategory = ((s && s.suggestedCategory) || "").trim();
    const suggestedSubcategory = ((s && s.suggestedSubcategory) || "").trim();
    if (!suggestedCategory || !suggestedSubcategory) continue;

    resolved.push({
      id: row[0],
      date: Utilities.formatDate(new Date(row[1]), tz, "yyyy/MM/dd"),
      content: row[2],
      amount: row[3],
      institution: row[4],
      currentCategory: row[5],
      currentSubcategory: row[6],
      suggestedCategory,
      suggestedSubcategory,
      isNewCategory: !existingPairKeys.has(`${suggestedCategory} ${suggestedSubcategory}`),
      reason: (s && s.reason) || "",
    });
  }

  return resolved;
}
