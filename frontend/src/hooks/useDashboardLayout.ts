export type DashboardSectionId = "upload" | "summary" | "trend" | "aiAdvice";

export interface DashboardSection {
  id: DashboardSectionId;
  visible: boolean;
}

export const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: "upload", visible: true },
  { id: "summary", visible: true },
  { id: "trend", visible: true },
  { id: "aiAdvice", visible: true },
];

const KNOWN_IDS: DashboardSectionId[] = DEFAULT_SECTIONS.map((s) => s.id);

function isKnownId(value: unknown): value is DashboardSectionId {
  return typeof value === "string" && (KNOWN_IDS as string[]).includes(value);
}

export function isValidSection(value: unknown): value is DashboardSection {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return isKnownId(candidate.id) && typeof candidate.visible === "boolean";
}

// 保存済みデータに未知のIDが含まれていれば無視し、
// 新しく追加されたセクションが無ければ末尾に補うことで将来の変更に耐える
export function normalizeSections(sections: DashboardSection[]): DashboardSection[] {
  const valid = sections.filter((s, index, arr) => arr.findIndex((o) => o.id === s.id) === index);
  const missing = DEFAULT_SECTIONS.filter((d) => !valid.some((v) => v.id === d.id));
  return [...valid, ...missing];
}
