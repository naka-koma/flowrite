function handleSummary(params) {
  const year = Number(params.year);
  const month = Number(params.month);

  if (!year || !month) {
    return { success: false, error: "year and month are required" };
  }

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { year, month, totalExpense: 0, totalIncome: 0, categories: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const categoryMap = {};
  let totalExpense = 0;
  let totalIncome = 0;

  for (const row of data) {
    const isTarget = row[9];
    const isTransfer = row[8];
    if (isTarget !== 1 || isTransfer === 1) continue;

    const date = new Date(row[1]);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month) continue;

    const amount = row[3];
    const category = row[5];

    if (amount < 0) {
      const absAmount = Math.abs(amount);
      totalExpense += absAmount;
      categoryMap[category] = (categoryMap[category] || 0) + absAmount;
    } else {
      totalIncome += amount;
    }
  }

  const categories = Object.entries(categoryMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  return { year, month, totalExpense, totalIncome, categories };
}

function handleTrend() {
  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { months: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const monthMap = {};

  for (const row of data) {
    const isTarget = row[9];
    const isTransfer = row[8];
    if (isTarget !== 1 || isTransfer === 1) continue;

    const date = new Date(row[1]);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const key = `${y}-${m}`;

    if (!monthMap[key]) {
      monthMap[key] = { year: y, month: m, totalExpense: 0, totalIncome: 0 };
    }

    const amount = row[3];
    if (amount < 0) {
      monthMap[key].totalExpense += Math.abs(amount);
    } else {
      monthMap[key].totalIncome += amount;
    }
  }

  const months = Object.values(monthMap).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return { months };
}
