function handleGetAiAttributes() {
  const sheet = getAiAttributesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { attributes: [] };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const attributes = values
    .filter((row) => row[0])
    .map((row) => ({ id: row[0], key: row[1], value: row[2] }));

  return { attributes };
}

function handleAddAiAttribute(body) {
  const key = (body.key || "").trim();
  const value = (body.value || "").trim();

  if (!key || !value) {
    return { success: false, error: "key and value are required" };
  }

  const sheet = getAiAttributesSheet();
  const id = Utilities.getUuid();
  sheet.appendRow([id, key, value]);

  return { success: true, attribute: { id, key, value } };
}

function handleUpdateAiAttribute(body) {
  const id = body.id;
  const key = (body.key || "").trim();
  const value = (body.value || "").trim();

  if (!id) {
    return { success: false, error: "id is required" };
  }
  if (!key || !value) {
    return { success: false, error: "key and value are required" };
  }

  const sheet = getAiAttributesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: "attribute not found" };
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = ids.findIndex((row) => row[0] === id);

  if (rowIndex === -1) {
    return { success: false, error: "attribute not found" };
  }

  sheet.getRange(rowIndex + 2, 2, 1, 2).setValues([[key, value]]);
  return { success: true };
}

function handleDeleteAiAttribute(body) {
  const id = body.id;
  if (!id) {
    return { success: false, error: "id is required" };
  }

  const sheet = getAiAttributesSheet();
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
