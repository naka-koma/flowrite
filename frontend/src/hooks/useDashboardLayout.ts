import { useEffect, useState } from "react";

export type DashboardSectionId = "upload" | "summary" | "trend" | "aiAdvice";

export interface DashboardSection {
  id: DashboardSectionId;
  visible: boolean;
}

const STORAGE_KEY = "flowrite-dashboard-layout";

const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: "upload", visible: true },
  { id: "summary", visible: true },
  { id: "trend", visible: true },
  { id: "aiAdvice", visible: true },
];

const KNOWN_IDS: DashboardSectionId[] = DEFAULT_SECTIONS.map((s) => s.id);

function isKnownId(value: unknown): value is DashboardSectionId {
  return typeof value === "string" && (KNOWN_IDS as string[]).includes(value);
}

function isValidSection(value: unknown): value is DashboardSection {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return isKnownId(candidate.id) && typeof candidate.visible === "boolean";
}

// 保存済みデータに未知のIDが含まれていれば無視し、
// 新しく追加されたセクションが無ければ末尾に補うことで将来の変更に耐える
function normalizeSections(sections: DashboardSection[]): DashboardSection[] {
  const valid = sections.filter((s, index, arr) => arr.findIndex((o) => o.id === s.id) === index);
  const missing = DEFAULT_SECTIONS.filter((d) => !valid.some((v) => v.id === d.id));
  return [...valid, ...missing];
}

function readStoredSections(): DashboardSection[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SECTIONS;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SECTIONS;

    const valid = parsed.filter(isValidSection);
    if (valid.length === 0) return DEFAULT_SECTIONS;

    return normalizeSections(valid);
  } catch {
    return DEFAULT_SECTIONS;
  }
}

export function useDashboardLayout() {
  const [sections, setSections] = useState<DashboardSection[]>(readStoredSections);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  }, [sections]);

  function toggleVisibility(id: DashboardSectionId) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }

  function moveSection(id: DashboardSectionId, direction: "up" | "down") {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const current = next[index]!;
      const target = next[targetIndex]!;
      next[index] = target;
      next[targetIndex] = current;
      return next;
    });
  }

  function resetLayout() {
    setSections(DEFAULT_SECTIONS);
  }

  return { sections, toggleVisibility, moveSection, resetLayout };
}
