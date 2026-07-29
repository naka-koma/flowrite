const COST_TYPES = ["fixed", "variable"];
const DEFAULT_COST_TYPE = "variable";

function handleGetCategories() {
  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { categories: {}, costTypes: {} };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const categories = {};
  const costTypes = {};

  for (const [category, subcategory, costType] of values) {
    if (!categories[category]) {
      categories[category] = [];
      costTypes[category] = DEFAULT_COST_TYPE;
    }
    if (!categories[category].includes(subcategory)) {
      categories[category].push(subcategory);
    }
    // 大項目単位の属性なので、同じ大項目の行で最初に見つかった有効な値を採用する
    // （中項目の追加時は空欄で追記されるため、既存行の値が失われないようにする）
    if (COST_TYPES.indexOf(costType) !== -1) {
      costTypes[category] = costType;
    }
  }

  return { categories, costTypes };
}

// 大項目単位で費目区分を更新する。(大項目, 中項目)の行構造上、
// 同じ大項目を持つ全行のcostType列をまとめて書き換える
function handleUpdateCategoryCostType(body) {
  const category = ((body && body.category) || "").trim();
  const costType = (body && body.costType) || "";

  if (!category) {
    return { success: false, error: "category is required" };
  }
  if (COST_TYPES.indexOf(costType) === -1) {
    return { success: false, error: "costType must be 'fixed' or 'variable'" };
  }

  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: "category not found" };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  let found = false;
  const updated = values.map((row) => {
    if (row[0] !== category) {
      return [row[2]];
    }
    found = true;
    return [costType];
  });

  if (!found) {
    return { success: false, error: "category not found" };
  }

  sheet.getRange(2, 3, updated.length, 1).setValues(updated);
  return { success: true };
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

// (category, subcategory)のペア単位でリネームする。該当する1行のみを更新する
// （同じ大項目を持つ他の行には影響しない。一括変更したい場合はhandleRenameCategoryを使う）
function handleUpdateCategoryPair(body) {
  const oldCategory = (body.oldCategory || "").trim();
  const oldSubcategory = (body.oldSubcategory || "").trim();
  const newCategory = (body.newCategory || "").trim();
  const newSubcategory = (body.newSubcategory || "").trim();

  if (!oldCategory || !oldSubcategory || !newCategory || !newSubcategory) {
    return { success: false, error: "oldCategory, oldSubcategory, newCategory and newSubcategory are required" };
  }
  if (oldCategory === newCategory && oldSubcategory === newSubcategory) {
    return { success: true };
  }

  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: "category pair not found" };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const rowIndex = values.findIndex((row) => row[0] === oldCategory && row[1] === oldSubcategory);
  if (rowIndex === -1) {
    return { success: false, error: "category pair not found" };
  }

  const duplicateExists = values.some(
    (row, i) => i !== rowIndex && row[0] === newCategory && row[1] === newSubcategory,
  );
  if (duplicateExists) {
    return { success: false, error: "category pair already exists" };
  }

  sheet.getRange(rowIndex + 2, 1, 1, 2).setValues([[newCategory, newSubcategory]]);
  return { success: true };
}

// (category, subcategory)のペア単位で削除する。該当する1行のみを削除する
// （同じ大項目を持つ他の行には影響しない。一括削除したい場合はhandleDeleteCategoryを使う）
function handleDeleteCategoryPair(body) {
  const category = (body.category || "").trim();
  const subcategory = (body.subcategory || "").trim();
  if (!category || !subcategory) {
    return { success: false, error: "category and subcategory are required" };
  }

  const sheet = getCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const rowIndex = values.findIndex((row) => row[0] === category && row[1] === subcategory);

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex + 2);
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
    // costType列も含めて詰め直さないと、残った行と費目区分がずれる
    const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    const kept = values.filter((row) => row[0] !== category);
    sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
    if (kept.length > 0) {
      sheet.getRange(2, 1, kept.length, 3).setValues(kept);
    }
  }

  return handleDeleteBudget({ category });
}
