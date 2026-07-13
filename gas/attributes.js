function handleGetAiAttributes() {
  const sheet = getAiAttributesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { attributes: [] };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const attributes = values
    .filter((row) => row[0])
    .map((row) => ({ key: row[0], value: row[1] }));

  return { attributes };
}

function handleUpsertAiAttribute(body) {
  const key = (body.key || "").trim();
  const value = (body.value || "").trim();

  if (!key || !value) {
    return { success: false, error: "key and value are required" };
  }

  const sheet = getAiAttributesSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        return { success: true };
      }
    }
  }

  sheet.appendRow([key, value]);
  return { success: true };
}

function handleDeleteAiAttribute(body) {
  const key = body.key;
  if (!key) {
    return { success: false, error: "key is required" };
  }

  const sheet = getAiAttributesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true };
  }

  const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowIndex = keys.findIndex((row) => row[0] === key);

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex + 2);
  }

  return { success: true };
}
