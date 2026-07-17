const AI_MEMORY_TYPES = ["insight", "categoryPattern"];

function handleGetAiMemories() {
  const sheet = getAiMemorySheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { memories: [] };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const memories = values
    .filter((row) => row[0])
    .map((row) => ({
      id: row[0],
      type: row[1],
      content: row[2],
      category: row[3],
      subcategory: row[4],
      createdAt: row[5],
    }));

  return { memories };
}

function handleAddAiMemory(body) {
  const type = (body && body.type) || "";
  const content = ((body && body.content) || "").trim();
  const category = ((body && body.category) || "").trim();
  const subcategory = ((body && body.subcategory) || "").trim();

  if (AI_MEMORY_TYPES.indexOf(type) === -1) {
    return { success: false, error: "type must be 'insight' or 'categoryPattern'" };
  }
  if (!content) {
    return { success: false, error: "content is required" };
  }
  if (type === "categoryPattern" && (!category || !subcategory)) {
    return { success: false, error: "category and subcategory are required for categoryPattern" };
  }

  const sheet = getAiMemorySheet();
  const id = Utilities.getUuid();
  const createdAt = new Date().toISOString();
  sheet.appendRow([id, type, content, category, subcategory, createdAt]);

  return { success: true, memory: { id, type, content, category, subcategory, createdAt } };
}

function handleDeleteAiMemory(body) {
  const id = body && body.id;
  if (!id) {
    return { success: false, error: "id is required" };
  }

  const sheet = getAiMemorySheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true };
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex((row) => row[0] === id);

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex + 2);
  }

  return { success: true };
}
