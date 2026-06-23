export interface UploadResponse {
  success: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}

export interface CategoryTotal {
  name: string;
  total: number;
}

export interface SummaryResponse {
  year: number;
  month: number;
  totalExpense: number;
  totalIncome: number;
  categories: CategoryTotal[];
  error?: string;
}

export interface MonthData {
  year: number;
  month: number;
  totalExpense: number;
  totalIncome: number;
}

export interface TrendResponse {
  months: MonthData[];
  error?: string;
}

export interface AiAdviceResponse {
  success: boolean;
  advice: string;
  error?: string;
}
