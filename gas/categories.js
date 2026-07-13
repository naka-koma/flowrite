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
