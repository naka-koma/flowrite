function categoryExists_(sheet, category) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return false;
  }
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return values.some((row) => row[0] === category);
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
    // セルが空・非数値の場合にNumber(row[1])がNaNになりうるため、0にフォールバックする
    .map((row) => ({ category: row[0], monthlyBudget: Number(row[1]) || 0 }));

  return { budgets };
}

// sourceとreasonは変更履歴（decisionsシート）への記録用。
// AIの見直し案から適用された場合は source="ai" と理由が渡る
function handleUpsertBudget(body) {
  const category = (body.category || "").trim();
  const monthlyBudget = Number(body.monthlyBudget);
  const source = body.source || "manual";
  const reason = body.reason || "";

  if (!category) {
    return { success: false, error: "category is required" };
  }
  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
    return { success: false, error: "monthlyBudget must be a non-negative number" };
  }

  const existingBudget = handleGetBudgets().budgets.find((b) => b.category === category);
  const beforeAmount = existingBudget ? existingBudget.monthlyBudget : null;

  // categoriesシートに未登録の大項目であれば、中項目を仮の値("未分類")で自動登録する
  const categoriesSheet = getCategoriesSheet();
  if (!categoryExists_(categoriesSheet, category)) {
    appendCategoryPairs(categoriesSheet, [{ category, subcategory: "未分類" }]);
  }

  const sheet = getBudgetsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const categories = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const rowIndex = categories.findIndex((row) => row[0] === category);

    if (rowIndex !== -1) {
      sheet.getRange(rowIndex + 2, 2, 1, 1).setValues([[monthlyBudget]]);
      recordDecision_({ type: "budget", target: category, beforeAmount, afterAmount: monthlyBudget, source, reason });
      return { success: true, budget: { category, monthlyBudget } };
    }
  }

  sheet.appendRow([category, monthlyBudget]);
  recordDecision_({ type: "budget", target: category, beforeAmount, afterAmount: monthlyBudget, source, reason });
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
