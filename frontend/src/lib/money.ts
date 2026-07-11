export function formatAmount(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

export function formatYen(amount: number): string {
  return `${formatAmount(amount)}円`;
}

// 万・億単位の表記（例: 「2万円」）にも対応した金額マスク
const YEN_AMOUNT_PATTERN = /[\d,]+(?:\.\d+)?[万億]?(?=\s*円)/g;
const MASK = "***";

// AIアドバイスなど自由記述テキスト中の金額表記をマスクする（画面共有用）
export function maskYenAmounts(text: string): string {
  return text.replace(YEN_AMOUNT_PATTERN, MASK);
}
