function resolveSummaryPeriod_(params) {
  const unit = params.unit || "month";

  if (unit === "week") {
    if (!params.weekStart) {
      return { error: "weekStart is required" };
    }
    const start = new Date(params.weekStart);
    if (isNaN(start.getTime())) {
      return { error: "weekStart is invalid" };
    }
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    const endInclusive = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const tz = Session.getScriptTimeZone();
    const label = `${Utilities.formatDate(start, tz, "yyyy/MM/dd")} 〜 ${Utilities.formatDate(endInclusive, tz, "yyyy/MM/dd")}`;
    return { unit, year: start.getFullYear(), start, end, label };
  }

  if (unit === "year") {
    const year = Number(params.year);
    if (!year) {
      return { error: "year is required" };
    }
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { unit, year, start, end, label: `${year}年` };
  }

  const year = Number(params.year);
  const month = Number(params.month);
  if (!year || !month) {
    return { error: "year and month are required" };
  }
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { unit: "month", year, month, start, end, label: `${year}年${month}月` };
}

function handleSummary(params) {
  const period = resolveSummaryPeriod_(params);
  if (period.error) {
    return { success: false, error: period.error };
  }
  const { unit, year, month, start, end, label } = period;

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { unit, year, month, label, totalExpense: 0, totalIncome: 0, categories: [] };
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
    if (date < start || date >= end) continue;

    const amount = row[3];
    const category = row[5];
    const content = row[2];

    if (amount < 0) {
      const absAmount = Math.abs(amount);
      totalExpense += absAmount;
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, transactions: [] };
      }
      categoryMap[category].total += absAmount;
      const formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy/MM/dd");
      categoryMap[category].transactions.push({ content, date: formattedDate, amount: absAmount });
    } else {
      totalIncome += amount;
    }
  }

  const categories = Object.entries(categoryMap)
    .map(([name, value]) => ({
      name,
      total: value.total,
      transactions: value.transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    }))
    .sort((a, b) => b.total - a.total);

  return { unit, year, month, label, totalExpense, totalIncome, categories };
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
