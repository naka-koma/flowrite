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

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface TodoAction {
  category: string;
  new_budget: number;
}

export interface StartAiChatParams {
  agendaTopic: string;
  summaryParams: SummaryParams;
}

export interface ContinueAiChatParams {
  history: ChatTurn[];
  userReply: string;
}

export interface AiChatResponse {
  success: boolean;
  ai_message: string;
  quick_replies: string[];
  is_final: boolean;
  todo_actions: TodoAction[];
  history: ChatTurn[];
  error?: string;
}

export interface CalendarDay {
  date: string;
  day: number;
  dayOfWeek: number;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  transactions: Transaction[];
}

export interface MonthlyCalendarParams {
  year: number;
  month: number;
}

export interface MonthlyCalendarResponse {
  year: number;
  month: number;
  label: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  days: CalendarDay[];
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
  agendaTopics: string;
  error?: string;
}

export interface UpdateSettingsResponse {
  success: boolean;
  error?: string;
}

export interface GetVersionResponse {
  version: string;
  error?: string;
}

export interface AiAttribute {
  id: string;
  key: string;
  value: string;
}

export interface GetAiAttributesResponse {
  attributes: AiAttribute[];
  error?: string;
}

export interface AddAiAttributeParams {
  key: string;
  value: string;
}

export interface AddAiAttributeResponse {
  success: boolean;
  attribute?: AiAttribute;
  error?: string;
}

export interface UpdateAiAttributeParams {
  id: string;
  key: string;
  value: string;
}

export interface UpdateAiAttributeResponse {
  success: boolean;
  error?: string;
}

export interface DeleteAiAttributeParams {
  id: string;
}

export interface DeleteAiAttributeResponse {
  success: boolean;
  error?: string;
}

export type AiMemoryType = "insight" | "categoryPattern";

export interface AiMemory {
  id: string;
  type: AiMemoryType;
  content: string;
  category: string;
  subcategory: string;
  createdAt: string;
}

export interface GetAiMemoriesResponse {
  memories: AiMemory[];
  error?: string;
}

export interface AddAiMemoryParams {
  type: AiMemoryType;
  content: string;
  category?: string;
  subcategory?: string;
}

export interface AddAiMemoryResponse {
  success: boolean;
  memory?: AiMemory;
  error?: string;
}

export interface DeleteAiMemoryParams {
  id: string;
}

export interface DeleteAiMemoryResponse {
  success: boolean;
  error?: string;
}

export interface AiFocusPoint {
  title: string;
  context: string;
}

export interface GetAiFocusPointsParams {
  summaryParams: SummaryParams;
}

export interface GetAiFocusPointsResponse {
  success: boolean;
  focusPoints: AiFocusPoint[];
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
  locked: boolean;
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
  locked: boolean;
}

export interface UpdateCategoryResponse {
  success: boolean;
  error?: string;
}

export type AiCategorySuggestionScope = "uncategorized" | "all";

export interface AiCategorySuggestionCategoryFilterEntry {
  category: string;
  subcategory: string;
}

export interface AiCategorySuggestionParams {
  year: number;
  month: number;
  scope: AiCategorySuggestionScope;
  categoryFilter?: AiCategorySuggestionCategoryFilterEntry[];
  institutionKeyword?: string;
  contentKeyword?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface AiCategorySuggestion {
  id: string;
  date: string;
  content: string;
  amount: number;
  institution: string;
  currentCategory: string;
  currentSubcategory: string;
  suggestedCategory: string;
  suggestedSubcategory: string;
  isNewCategory: boolean;
  reason: string;
}

export interface AiCategorySuggestionsResponse {
  success: boolean;
  suggestions: AiCategorySuggestion[];
  targetCount: number;
  error?: string;
}

export interface ApplyAiCategorySuggestionsParams {
  suggestions: { id: string; category: string; subcategory: string }[];
}

export interface ApplyAiCategorySuggestionsResponse {
  success: boolean;
  applied: number;
  notFound: number;
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

export interface RenameCategoryParams {
  oldCategory: string;
  newCategory: string;
}

export interface RenameCategoryResponse {
  success: boolean;
  error?: string;
}

export interface DeleteCategoryParams {
  category: string;
}

export interface DeleteCategoryResponse {
  success: boolean;
  error?: string;
}

export interface CategoryPair {
  category: string;
  subcategory: string;
}

export interface UpdateCategoryPairParams {
  oldCategory: string;
  oldSubcategory: string;
  newCategory: string;
  newSubcategory: string;
}

export interface UpdateCategoryPairResponse {
  success: boolean;
  error?: string;
}

export interface DeleteCategoryPairParams {
  category: string;
  subcategory: string;
}

export interface DeleteCategoryPairResponse {
  success: boolean;
  error?: string;
}

export interface Budget {
  category: string;
  monthlyBudget: number;
}

export interface GetBudgetsResponse {
  budgets: Budget[];
  error?: string;
}

export interface UpsertBudgetParams {
  category: string;
  monthlyBudget: number;
}

export interface UpsertBudgetResponse {
  success: boolean;
  budget?: Budget;
  error?: string;
}

export interface DeleteBudgetParams {
  category: string;
}

export interface DeleteBudgetResponse {
  success: boolean;
  error?: string;
}

export interface BudgetVarianceEntry {
  category: string;
  budget: number;
  actual: number;
  variance: number;
}

export interface GetBudgetVarianceParams {
  year: number;
  month: number;
}

export interface GetBudgetVarianceResponse {
  unit?: SummaryUnit;
  year?: number;
  month?: number;
  label?: string;
  entries: BudgetVarianceEntry[];
  error?: string;
}
