function buildCategoryOptions_(data) {
  const categoryOptions = [];
  const seenCategories = new Set();
  const subcategoryOptionsByCategory = {};

  for (const row of data) {
    const category = row[5];
    const subcategory = row[6];

    if (!seenCategories.has(category)) {
      seenCategories.add(category);
      categoryOptions.push(category);
    }

    if (!subcategoryOptionsByCategory[category]) {
      subcategoryOptionsByCategory[category] = [];
    }
    if (!subcategoryOptionsByCategory[category].includes(subcategory)) {
      subcategoryOptionsByCategory[category].push(subcategory);
    }
  }

  return { categoryOptions, subcategoryOptionsByCategory };
}

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

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      transactions: [],
      totalCount: 0,
      page,
      pageSize,
      categoryOptions: [],
      subcategoryOptionsByCategory: {},
    };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const { categoryOptions, subcategoryOptionsByCategory } = buildCategoryOptions_(data);

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

  sheet.getRange(rowIndex + 2, 6, 1, 2).setValues([[category, subcategory]]);

  return { success: true };
}
