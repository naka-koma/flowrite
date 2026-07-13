function resolveSummaryPeriod_(params) {
  const unit = params.unit || "month";

  if (unit === "all") {
    return { unit, label: "全期間" };
  }

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

function shiftMonth_(year, month, delta) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function monthRange_(year, month) {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

// unit=month時のみ、前月・前年同月の集計範囲を組み立てる（メイン集計と同じループ内で振り分けるため）
function buildComparisonRanges_(year, month) {
  const previousMonth = shiftMonth_(year, month, -1);
  const previousYear = { year: year - 1, month };

  return {
    previousMonth: {
      ...monthRange_(previousMonth.year, previousMonth.month),
      label: `${previousMonth.year}年${previousMonth.month}月`,
      totalExpense: 0,
      totalIncome: 0,
    },
    previousYear: {
      ...monthRange_(previousYear.year, previousYear.month),
      label: `${previousYear.year}年${previousYear.month}月`,
      totalExpense: 0,
      totalIncome: 0,
    },
  };
}

function buildComparison_(totalExpense, totalIncome, ranges) {
  const balance = totalIncome - totalExpense;
  const comparison = {};

  for (const key of Object.keys(ranges)) {
    const r = ranges[key];
    const rBalance = r.totalIncome - r.totalExpense;
    comparison[key] = {
      label: r.label,
      totalExpense: r.totalExpense,
      totalIncome: r.totalIncome,
      balance: rBalance,
      expenseDiff: totalExpense - r.totalExpense,
      incomeDiff: totalIncome - r.totalIncome,
      balanceDiff: balance - rBalance,
    };
  }

  return comparison;
}

function toCategoryList_(categoryMap) {
  return Object.entries(categoryMap)
    .map(([name, value]) => ({
      name,
      total: value.total,
      transactions: value.transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    }))
    .sort((a, b) => b.total - a.total);
}

function handleSummary(params) {
  const period = resolveSummaryPeriod_(params);
  if (period.error) {
    return { success: false, error: period.error };
  }
  const { unit, year, month, start, end, label } = period;

  // 前月・前年同月比較はunit=monthのみ対象（週・年には自然に対応しない概念のため）
  const comparisonRanges = unit === "month" ? buildComparisonRanges_(year, month) : null;

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    const empty = { unit, year, month, label, totalExpense: 0, totalIncome: 0, categories: [], incomeCategories: [] };
    if (comparisonRanges) {
      empty.comparison = buildComparison_(0, 0, comparisonRanges);
    }
    return empty;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const categoryMap = {};
  const incomeCategoryMap = {};
  let totalExpense = 0;
  let totalIncome = 0;

  for (const row of data) {
    const isTarget = row[9];
    const isTransfer = row[8];
    if (isTarget !== 1 || isTransfer === 1) continue;

    const date = new Date(row[1]);
    const amount = row[3];
    const category = row[5];
    const content = row[2];

    // 前月・前年同月の合計は、メインの期間フィルタとは別枠で同じ行ループ内に振り分けて集計する
    // （raw_dataの読み込み・ループを比較期間ごとに繰り返さないため）
    if (comparisonRanges) {
      for (const key of Object.keys(comparisonRanges)) {
        const range = comparisonRanges[key];
        if (date >= range.start && date < range.end) {
          if (amount < 0) {
            range.totalExpense += Math.abs(amount);
          } else {
            range.totalIncome += amount;
          }
        }
      }
    }

    // unit=allの場合はstart/endが存在しないため日付フィルタをかけない（全期間集計）
    if (start && (date < start || date >= end)) continue;

    const formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy/MM/dd");

    if (amount < 0) {
      const absAmount = Math.abs(amount);
      totalExpense += absAmount;
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, transactions: [] };
      }
      categoryMap[category].total += absAmount;
      categoryMap[category].transactions.push({ content, date: formattedDate, amount: absAmount });
    } else {
      totalIncome += amount;
      if (!incomeCategoryMap[category]) {
        incomeCategoryMap[category] = { total: 0, transactions: [] };
      }
      incomeCategoryMap[category].total += amount;
      incomeCategoryMap[category].transactions.push({ content, date: formattedDate, amount });
    }
  }

  const result = {
    unit,
    year,
    month,
    label,
    totalExpense,
    totalIncome,
    categories: toCategoryList_(categoryMap),
    incomeCategories: toCategoryList_(incomeCategoryMap),
  };

  if (comparisonRanges) {
    result.comparison = buildComparison_(totalExpense, totalIncome, comparisonRanges);
  }

  return result;
}

function handleMonthlyCalendar(params) {
  const year = Number(params.year);
  const month = Number(params.month);
  if (!year || !month) {
    return { error: "year and month are required" };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const label = `${year}年${month}月`;

  const dayMap = {};
  for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
    dayMap[d] = { totalExpense: 0, totalIncome: 0 };
  }

  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  let totalExpense = 0;
  let totalIncome = 0;

  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

    for (const row of data) {
      const isTarget = row[9];
      const isTransfer = row[8];
      if (isTarget !== 1 || isTransfer === 1) continue;

      const date = new Date(row[1]);
      if (date < start || date >= end) continue;

      const amount = row[3];
      const day = date.getDate();

      if (amount < 0) {
        const absAmount = Math.abs(amount);
        dayMap[day].totalExpense += absAmount;
        totalExpense += absAmount;
      } else {
        dayMap[day].totalIncome += amount;
        totalIncome += amount;
      }
    }
  }

  const tz = Session.getScriptTimeZone();
  const days = Object.keys(dayMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((day) => {
      const date = new Date(year, month - 1, day);
      const dayTotals = dayMap[day];
      return {
        date: Utilities.formatDate(date, tz, "yyyy-MM-dd"),
        day,
        dayOfWeek: date.getDay(),
        totalExpense: dayTotals.totalExpense,
        totalIncome: dayTotals.totalIncome,
        balance: dayTotals.totalIncome - dayTotals.totalExpense,
      };
    });

  return {
    year,
    month,
    label,
    totalExpense,
    totalIncome,
    balance: totalIncome - totalExpense,
    days,
  };
}

function getMondayOfWeek_(date) {
  const day = (date.getDay() + 6) % 7; // 月曜=0 ... 日曜=6
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
}

function resolveTrendGroup_(unit, date) {
  if (unit === "year") {
    const y = date.getFullYear();
    return { key: `${y}`, sortKey: y, label: `${y}年` };
  }

  if (unit === "week") {
    const monday = getMondayOfWeek_(date);
    const tz = Session.getScriptTimeZone();
    return {
      key: Utilities.formatDate(monday, tz, "yyyy-MM-dd"),
      sortKey: monday.getTime(),
      label: Utilities.formatDate(monday, tz, "MM/dd"),
    };
  }

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return { key: `${y}-${m}`, sortKey: y * 100 + m, label: `${y}/${m}` };
}

function handleTrend(params) {
  const unit = (params && params.unit) || "month";
  const sheet = getRawDataSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { unit, points: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const groupMap = {};

  for (const row of data) {
    const isTarget = row[9];
    const isTransfer = row[8];
    if (isTarget !== 1 || isTransfer === 1) continue;

    const date = new Date(row[1]);
    const { key, sortKey, label } = resolveTrendGroup_(unit, date);

    if (!groupMap[key]) {
      groupMap[key] = { sortKey, label, totalExpense: 0, totalIncome: 0 };
    }

    const amount = row[3];
    if (amount < 0) {
      groupMap[key].totalExpense += Math.abs(amount);
    } else {
      groupMap[key].totalIncome += amount;
    }
  }

  const points = Object.values(groupMap)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ label, totalExpense, totalIncome }) => ({ label, totalExpense, totalIncome }));

  return { unit, points };
}
