// 貯蓄目標の指定方法。amount=定額（円）、rate=収入に対する割合（%）
const SAVINGS_TARGET_MODES = ["amount", "rate"];

function getGoalsMap_() {
  const sheet = getGoalsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {};
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const map = {};
  values.forEach((row) => {
    if (row[0]) {
      map[row[0]] = row[1];
    }
  });
  return map;
}

function setGoal_(key, value) {
  const sheet = getGoalsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
  }

  sheet.appendRow([key, value]);
}

function toNonNegativeNumber_(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

// 定額・率のどちらの指定方法でも、計算時には目標貯蓄額（円）に解決する
function resolveSavingsTarget_(goals) {
  if (goals.savingsTargetMode === "rate") {
    return Math.round((goals.monthlyIncome * goals.savingsTargetRate) / 100);
  }
  return goals.savingsTargetAmount;
}

function handleGetGoals() {
  const map = getGoalsMap_();
  const mode = SAVINGS_TARGET_MODES.indexOf(map.savingsTargetMode) === -1 ? "amount" : map.savingsTargetMode;

  const goals = {
    monthlyIncome: toNonNegativeNumber_(map.monthlyIncome),
    savingsTargetMode: mode,
    savingsTargetAmount: toNonNegativeNumber_(map.savingsTargetAmount),
    savingsTargetRate: toNonNegativeNumber_(map.savingsTargetRate),
    // 帰省・イベントなど不定期支出を月割りで積み立てる額（年間特別費の月割り）
    specialReserveAmount: toNonNegativeNumber_(map.specialReserveAmount),
  };

  const resolvedSavingsTarget = resolveSavingsTarget_(goals);
  // 目標が収入を上回る場合は負になるが、実現不可能な計画であることを示す情報として
  // そのまま返し、UI側で警告できるようにする
  const spendableTotal = goals.monthlyIncome - resolvedSavingsTarget - goals.specialReserveAmount;

  return Object.assign({}, goals, { resolvedSavingsTarget, spendableTotal });
}

function handleUpdateGoals(body) {
  const params = body || {};

  if (params.monthlyIncome !== undefined) {
    const monthlyIncome = Number(params.monthlyIncome);
    if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
      return { success: false, error: "monthlyIncome must be a non-negative number" };
    }
    setGoal_("monthlyIncome", monthlyIncome);
  }

  if (params.savingsTargetMode !== undefined) {
    if (SAVINGS_TARGET_MODES.indexOf(params.savingsTargetMode) === -1) {
      return { success: false, error: "savingsTargetMode must be 'amount' or 'rate'" };
    }
    setGoal_("savingsTargetMode", params.savingsTargetMode);
  }

  if (params.savingsTargetAmount !== undefined) {
    const savingsTargetAmount = Number(params.savingsTargetAmount);
    if (!Number.isFinite(savingsTargetAmount) || savingsTargetAmount < 0) {
      return { success: false, error: "savingsTargetAmount must be a non-negative number" };
    }
    setGoal_("savingsTargetAmount", savingsTargetAmount);
  }

  if (params.savingsTargetRate !== undefined) {
    const savingsTargetRate = Number(params.savingsTargetRate);
    if (!Number.isFinite(savingsTargetRate) || savingsTargetRate < 0 || savingsTargetRate > 100) {
      return { success: false, error: "savingsTargetRate must be between 0 and 100" };
    }
    setGoal_("savingsTargetRate", savingsTargetRate);
  }

  if (params.specialReserveAmount !== undefined) {
    const specialReserveAmount = Number(params.specialReserveAmount);
    if (!Number.isFinite(specialReserveAmount) || specialReserveAmount < 0) {
      return { success: false, error: "specialReserveAmount must be a non-negative number" };
    }
    setGoal_("specialReserveAmount", specialReserveAmount);
  }

  return { success: true, goals: handleGetGoals() };
}
