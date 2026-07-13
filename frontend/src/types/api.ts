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

export type SummaryUnit = "month" | "year" | "week" | "all";

export type SummaryParams =
  | { unit: "month"; year: number; month: number }
  | { unit: "year"; year: number }
  | { unit: "week"; weekStart: string }
  | { unit: "all" };

export interface PeriodComparisonEntry {
  label: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  expenseDiff: number;
  incomeDiff: number;
  balanceDiff: number;
}

export interface PeriodComparison {
  previousMonth: PeriodComparisonEntry;
  previousYear: PeriodComparisonEntry;
}

export interface SummaryResponse {
  unit: SummaryUnit;
  year?: number;
  month?: number;
  label: string;
  totalExpense: number;
  totalIncome: number;
  categories: CategoryTotal[];
  incomeCategories: CategoryTotal[];
  comparison?: PeriodComparison;
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

export interface PreferencesResponse {
  theme: string;
  dashboardLayout: string;
  trendVisibleCount: string;
  error?: string;
}

export type PreferenceKey = "theme" | "dashboardLayout" | "trendVisibleCount";

export interface UpdatePreferenceParams {
  key: PreferenceKey;
  value: string;
}

export interface UpdatePreferenceResponse {
  success: boolean;
  error?: string;
}

export interface TransactionRow {
  id: string;
  date: string;
  content: string;
  amount: number;
  institution: string;
  category: string;
  subcategory: string;
  memo: string;
}

export interface TransactionListParams {
  year: number;
  month: number;
  page: number;
  pageSize: number;
}

export interface TransactionListResponse {
  transactions: TransactionRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  categoryOptions: string[];
  subcategoryOptionsByCategory: Record<string, string[]>;
  error?: string;
}

export interface UpdateCategoryParams {
  id: string;
  category: string;
  subcategory: string;
  memo: string;
}

export interface UpdateCategoryResponse {
  success: boolean;
  error?: string;
}

export type CategoryMaster = Record<string, string[]>;

export interface GetCategoriesResponse {
  categories: CategoryMaster;
  error?: string;
}

export interface AddCategoryParams {
  category: string;
  subcategory: string;
}

export interface AddCategoryResponse {
  success: boolean;
  error?: string;
}
