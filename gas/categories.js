function handleGetCategories() {
  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { categories: {} };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const categories = {};

  for (const [category, subcategory] of values) {
    if (!categories[category]) {
      categories[category] = [];
    }
    if (!categories[category].includes(subcategory)) {
      categories[category].push(subcategory);
    }
  }

  return { categories };
}

function handleAddCategory(body) {
  const category = (body.category || "").trim();
  const subcategory = (body.subcategory || "").trim();

  if (!category || !subcategory) {
    return { success: false, error: "category and subcategory are required" };
  }

  const sheet = getCategoriesSheet();
  const existingPairs = getExistingCategoryPairs(sheet);
  const key = `${category} ${subcategory}`;

  if (!existingPairs.has(key)) {
    appendCategoryPairs(sheet, [{ category, subcategory }]);
  }

  return { success: true };
}

// 大項目単位でリネームする。該当する(category, subcategory)行を一括更新し、
// budgetsシートに対応する予算行があれば追従させる（raw_dataは更新しない）
function handleRenameCategory(body) {
  const oldCategory = (body.oldCategory || "").trim();
  const newCategory = (body.newCategory || "").trim();

  if (!oldCategory || !newCategory) {
    return { success: false, error: "oldCategory and newCategory are required" };
  }
  if (oldCategory === newCategory) {
    return { success: true };
  }

  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const updated = values.map((row) => (row[0] === oldCategory ? [newCategory, row[1]] : row));
    sheet.getRange(2, 1, updated.length, 2).setValues(updated);
  }

  const budgetsSheet = getBudgetsSheet();
  const budgetsLastRow = budgetsSheet.getLastRow();
  if (budgetsLastRow > 1) {
    const categories = budgetsSheet.getRange(2, 1, budgetsLastRow - 1, 1).getValues();
    const rowIndex = categories.findIndex((row) => row[0] === oldCategory);
    if (rowIndex !== -1) {
      budgetsSheet.getRange(rowIndex + 2, 1, 1, 1).setValues([[newCategory]]);
    }
  }

  return { success: true };
}

// 大項目単位で削除する。該当する(category, subcategory)行をすべて削除し、
// budgetsシートに対応する予算行があれば削除する（raw_dataは更新しない）
function handleDeleteCategory(body) {
  const category = (body.category || "").trim();
  if (!category) {
    return { success: false, error: "category is required" };
  }

  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const kept = values.filter((row) => row[0] !== category);
    sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    if (kept.length > 0) {
      sheet.getRange(2, 1, kept.length, 2).setValues(kept);
    }
  }

  return handleDeleteBudget({ category });
}
