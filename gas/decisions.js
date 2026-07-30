// 予算・目標をいつ・なぜ・いくらから変えたのかを記録する。
// 現在値しか持たないと「先月の見直しが効いたのか」を検証できないため、
// 変更の履歴を残してAI・ユーザーの双方が振り返れるようにする。

const DECISION_TYPES = ["budget", "savingsTarget", "specialReserve"];
const DECISION_SOURCES = ["ai", "manual"];

// AIが履歴ツールで一度に受け取る件数の既定値と上限
const DEFAULT_DECISION_LIMIT = 20;
const MAX_DECISION_LIMIT = 100;

// 値が変わっていない場合は記録しない。目標フォームは毎回すべての項目を
// 送ってくるため、素直に記録するとノイズだらけになる
function recordDecision_(entry) {
  if (DECISION_TYPES.indexOf(entry.type) === -1) {
    return false;
  }
  if (entry.beforeAmount === entry.afterAmount) {
    return false;
  }

  const source = DECISION_SOURCES.indexOf(entry.source) === -1 ? "manual" : entry.source;
  getDecisionsSheet().appendRow([
    Utilities.getUuid(),
    new Date().toISOString(),
    source,
    entry.type,
    entry.target || "",
    // 新規設定時は変更前が存在しないため空欄にする（0円からの変更と区別する）
    entry.beforeAmount === null || entry.beforeAmount === undefined ? "" : entry.beforeAmount,
    entry.afterAmount,
    (entry.reason || "").trim(),
  ]);
  return true;
}

// 目標は複数項目をまとめて更新するため、解決後の金額同士を突き合わせて
// 実際に変わったものだけを記録する（率→定額のモード変更も金額の変化として扱える）
function recordGoalDecisions_(before, after, source, reason) {
  recordDecision_({
    type: "savingsTarget",
    beforeAmount: before.resolvedSavingsTarget,
    afterAmount: after.resolvedSavingsTarget,
    source,
    reason,
  });
  recordDecision_({
    type: "specialReserve",
    beforeAmount: before.specialReserveAmount,
    afterAmount: after.specialReserveAmount,
    source,
    reason,
  });
}

function handleGetDecisions(body) {
  const requested = Number(body && body.limit) || DEFAULT_DECISION_LIMIT;
  const limit = Math.min(Math.max(requested, 1), MAX_DECISION_LIMIT);

  const sheet = getDecisionsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { decisions: [] };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const decisions = values
    .filter((row) => row[0])
    .map((row) => ({
      id: row[0],
      changedAt: row[1],
      source: row[2],
      type: row[3],
      target: row[4],
      beforeAmount: row[5] === "" ? null : Number(row[5]),
      afterAmount: Number(row[6]),
      reason: row[7],
    }));

  // 新しいものから返す
  decisions.reverse();
  return { decisions: decisions.slice(0, limit) };
}
