function getExistingCategoryNames_() {
  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return new Set();
  }
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return new Set(values.map((row) => row[0]));
}

function handleGetBudgets() {
  const sheet = getBudgetsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { budgets: [] };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const budgets = values
    .filter((row) => row[0])
    .map((row) => ({ category: row[0], monthlyBudget: row[1] }));

  return { budgets };
}

function handleUpsertBudget(body) {
  const category = (body.category || "").trim();
  const monthlyBudget = Number(body.monthlyBudget);

  if (!category) {
    return { success: false, error: "category is required" };
  }
  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
    return { success: false, error: "monthlyBudget must be a non-negative number" };
  }
  if (!getExistingCategoryNames_().has(category)) {
    return { success: false, error: "category does not exist" };
  }

  const sheet = getBudgetsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const categories = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const rowIndex = categories.findIndex((row) => row[0] === category);

    if (rowIndex !== -1) {
      sheet.getRange(rowIndex + 2, 2, 1, 1).setValues([[monthlyBudget]]);
      return { success: true, budget: { category, monthlyBudget } };
    }
  }

  sheet.appendRow([category, monthlyBudget]);
  return { success: true, budget: { category, monthlyBudget } };
}

function handleDeleteBudget(body) {
  const category = (body.category || "").trim();
  if (!category) {
    return { success: false, error: "category is required" };
  }

  const sheet = getBudgetsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true };
  }

  const categories = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = categories.findIndex((row) => row[0] === category);

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex + 2);
  }

  return { success: true };
}
