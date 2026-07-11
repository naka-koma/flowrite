// 週は月曜始まり（ISO 8601週）として扱う

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" をローカル日付として解釈する（new Date(string)のUTC解釈を避ける）
export function parseISODate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`invalid date: ${value}`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function getMondayOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7; // 月曜=0 ... 日曜=6
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
}

function getISOWeek(date: Date): { isoYear: number; isoWeek: number } {
  const monday = getMondayOfWeek(date);
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  const jan4 = new Date(isoYear, 0, 4);
  const week1Monday = getMondayOfWeek(jan4);
  const diffDays = Math.round((monday.getTime() - week1Monday.getTime()) / 86400000);
  const isoWeek = Math.floor(diffDays / 7) + 1;

  return { isoYear, isoWeek };
}

// Date -> <input type="week"> の value（"YYYY-Www"）
export function dateToWeekInputValue(date: Date): string {
  const { isoYear, isoWeek } = getISOWeek(date);
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

// <input type="week"> の value（"YYYY-Www"）-> その週の月曜日
export function weekInputValueToMonday(value: string): Date | null {
  const match = value.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;

  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);

  const jan4 = new Date(isoYear, 0, 4);
  const week1Monday = getMondayOfWeek(jan4);
  return new Date(week1Monday.getFullYear(), week1Monday.getMonth(), week1Monday.getDate() + (isoWeek - 1) * 7);
}
