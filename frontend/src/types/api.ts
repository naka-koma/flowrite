export interface UploadResponse {
  success: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}

export interface FileUploadResult {
  fileName: string;
  success: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}

export interface Transaction {
  content: string;
  date: string;
  amount: number;
}

export interface CategoryTotal {
  name: string;
  total: number;
  transactions: Transaction[];
}

export type SummaryUnit = "month" | "year" | "week";

export type SummaryParams =
  | { unit: "month"; year: number; month: number }
  | { unit: "year"; year: number }
  | { unit: "week"; weekStart: string };

export interface SummaryResponse {
  unit: SummaryUnit;
  year: number;
  month?: number;
  label: string;
  totalExpense: number;
  totalIncome: number;
  categories: CategoryTotal[];
  error?: string;
}

export interface TrendPoint {
  label: string;
  totalExpense: number;
  totalIncome: number;
}

export type TrendParams = { unit: SummaryUnit };

export interface TrendResponse {
  unit: SummaryUnit;
  points: TrendPoint[];
  error?: string;
}

export interface AiAdviceResponse {
  success: boolean;
  advice: string;
  error?: string;
}

export interface MigrationResult {
  id: string;
  description: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface RunMigrationsResponse {
  results: MigrationResult[];
  appliedCount: number;
  error?: string;
}

export interface Settings {
  prompt: string;
  model: string;
  error?: string;
}

export interface UpdateSettingsResponse {
  success: boolean;
  error?: string;
}
