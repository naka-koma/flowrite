import type {
  AddCategoryParams,
  CalendarDay,
  MonthlyCalendarParams,
  PreferenceKey,
  Settings,
  SummaryParams,
  SummaryUnit,
  TransactionListParams,
  TransactionRow,
  TrendParams,
  TrendPoint,
  UpdateCategoryParams,
  UpdatePreferenceParams,
} from "../types/api";

interface ScriptRun {
  withSuccessHandler(cb: (result: unknown) => void): ScriptRun;
  withFailureHandler(cb: (error: Error) => void): ScriptRun;
  [functionName: string]: unknown;
}

interface MockScenario {
  trendEmpty?: boolean;
  trendManyPoints?: boolean;
  transactionListEmpty?: boolean;
}

function getScenario(): MockScenario {
  const value = (window as unknown as { __MOCK_SCENARIO__?: MockScenario }).__MOCK_SCENARIO__;
  return value ?? {};
}

function mockHandleUpload(body: { csv: string }) {
  const csvText = atob(body.csv);

  if (csvText.includes("INVALID")) {
    return { success: false, inserted: 0, skipped: 0, error: "CSVの形式が正しくありません" };
  }

  return { success: true, inserted: 12, skipped: 3 };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function mockHandleSummary(params: SummaryParams) {
  if (params.unit === "all") {
    return {
      unit: "all" as const,
      label: "全期間",
      totalExpense: 9000000,
      totalIncome: 18000000,
      categories: [
        { name: "食費", total: 2400000, transactions: [] },
        { name: "交通費", total: 1200000, transactions: [] },
        { name: "住居", total: 4800000, transactions: [] },
        { name: "娯楽", total: 600000, transactions: [] },
      ],
      incomeCategories: [
        { name: "給与", total: 17000000, transactions: [] },
        { name: "賞与", total: 1000000, transactions: [] },
      ],
    };
  }

  if (params.unit === "year") {
    return {
      unit: "year" as const,
      year: params.year,
      label: `${params.year}年`,
      totalExpense: 1800000,
      totalIncome: 3600000,
      categories: [
        { name: "食費", total: 480000, transactions: [] },
        { name: "交通費", total: 240000, transactions: [] },
        { name: "住居", total: 960000, transactions: [] },
        { name: "娯楽", total: 120000, transactions: [] },
      ],
      incomeCategories: [
        { name: "給与", total: 3400000, transactions: [] },
        { name: "賞与", total: 200000, transactions: [] },
      ],
    };
  }

  if (params.unit === "week") {
    return {
      unit: "week" as const,
      year: Number(params.weekStart.slice(0, 4)),
      label: `${params.weekStart}の週`,
      totalExpense: 35000,
      totalIncome: 0,
      categories: [
        {
          name: "食費",
          total: 20000,
          transactions: [{ content: "スーパー", date: params.weekStart, amount: 3000 }],
        },
        { name: "娯楽", total: 15000, transactions: [] },
      ],
      incomeCategories: [],
    };
  }

  const year = Number(params.year);
  const month = Number(params.month);

  // MonthSelectorが選択肢に出す最古の月（24ヶ月前）をデータなしケースとして扱う
  const now = new Date();
  const oldest = new Date(now.getFullYear(), now.getMonth() - 23, 1);
  const isOldestMonth = year === oldest.getFullYear() && month === oldest.getMonth() + 1;

  const previousMonth = shiftMonth(year, month, -1);
  const previousYear = { year: year - 1, month };

  if (isOldestMonth) {
    return {
      unit: "month" as const,
      year,
      month,
      label: `${year}年${month}月`,
      totalExpense: 0,
      totalIncome: 0,
      categories: [],
      incomeCategories: [],
      comparison: {
        previousMonth: {
          label: `${previousMonth.year}年${previousMonth.month}月`,
          totalExpense: 0,
          totalIncome: 0,
          balance: 0,
          expenseDiff: 0,
          incomeDiff: 0,
          balanceDiff: 0,
        },
        previousYear: {
          label: `${previousYear.year}年${previousYear.month}月`,
          totalExpense: 0,
          totalIncome: 0,
          balance: 0,
          expenseDiff: 0,
          incomeDiff: 0,
          balanceDiff: 0,
        },
      },
    };
  }

  return {
    unit: "month" as const,
    year,
    month,
    label: `${year}年${month}月`,
    totalExpense: 150000,
    totalIncome: 300000,
    categories: [
      {
        name: "食費",
        total: 40000,
        transactions: [
          { content: "スーパー", date: `${year}/${String(month).padStart(2, "0")}/03`, amount: 3000 },
          { content: "コンビニ", date: `${year}/${String(month).padStart(2, "0")}/10`, amount: 800 },
        ],
      },
      {
        name: "交通費",
        total: 20000,
        transactions: [
          { content: "電車", date: `${year}/${String(month).padStart(2, "0")}/05`, amount: 5000 },
        ],
      },
      { name: "娯楽", total: 15000, transactions: [] },
      { name: "光熱費", total: 12000, transactions: [] },
      { name: "その他", total: 63000, transactions: [] },
    ],
    incomeCategories: [
      {
        name: "給与",
        total: 280000,
        transactions: [
          { content: "給与振込", date: `${year}/${String(month).padStart(2, "0")}/25`, amount: 280000 },
        ],
      },
      { name: "一時所得", total: 20000, transactions: [] },
    ],
    comparison: {
      previousMonth: {
        label: `${previousMonth.year}年${previousMonth.month}月`,
        totalExpense: 180000,
        totalIncome: 290000,
        balance: 110000,
        expenseDiff: 150000 - 180000,
        incomeDiff: 300000 - 290000,
        balanceDiff: 150000 - 110000,
      },
      previousYear: {
        label: `${previousYear.year}年${previousYear.month}月`,
        totalExpense: 140000,
        totalIncome: 270000,
        balance: 130000,
        expenseDiff: 150000 - 140000,
        incomeDiff: 300000 - 270000,
        balanceDiff: 150000 - 130000,
      },
    },
  };
}

function mockHandleMonthlyCalendar(params: MonthlyCalendarParams) {
  const { year, month } = params;
  const daysInMonth = new Date(year, month, 0).getDate();

  let totalExpense = 0;
  let totalIncome = 0;

  const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month - 1, day);
    const hasData = day % 5 === 0;
    const dayExpense = hasData ? 1000 + day * 100 : 0;
    const dayIncome = day === 25 ? 280000 : 0;

    totalExpense += dayExpense;
    totalIncome += dayIncome;

    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      dayOfWeek: date.getDay(),
      totalExpense: dayExpense,
      totalIncome: dayIncome,
      balance: dayIncome - dayExpense,
    };
  });

  return {
    year,
    month,
    label: `${year}年${month}月`,
    totalExpense,
    totalIncome,
    balance: totalIncome - totalExpense,
    days,
  };
}

// 表示件数の上限（TrendChart側のUNIT_VISIBLE_LIMITSと同じ想定）を超えるダミーデータを生成する
function generateManyPoints(unit: SummaryUnit): TrendPoint[] {
  if (unit === "year") {
    return Array.from({ length: 8 }, (_, i) => ({
      label: `${2018 + i}年`,
      totalExpense: 1500000 + i * 10000,
      totalIncome: 3500000,
    }));
  }

  if (unit === "week") {
    return Array.from({ length: 20 }, (_, i) => ({
      label: `${String((i % 12) + 1).padStart(2, "0")}/${String((i % 4) * 7 + 1).padStart(2, "0")}`,
      totalExpense: 20000 + i * 500,
      totalIncome: 0,
    }));
  }

  return Array.from({ length: 20 }, (_, i) => ({
    label: `2023/${(i % 12) + 1}`,
    totalExpense: 100000 + i * 1000,
    totalIncome: 300000,
  }));
}

function mockHandleTrend(params: TrendParams) {
  const unit = params?.unit ?? "month";

  if (getScenario().trendEmpty) {
    return { unit, points: [] };
  }

  if (getScenario().trendManyPoints) {
    return { unit, points: generateManyPoints(unit) };
  }

  if (unit === "year") {
    return {
      unit,
      points: [
        { label: "2022年", totalExpense: 1750000, totalIncome: 3500000 },
        { label: "2023年", totalExpense: 1820000, totalIncome: 3550000 },
        { label: "2024年", totalExpense: 1800000, totalIncome: 3600000 },
      ],
    };
  }

  if (unit === "week") {
    return {
      unit,
      points: [
        { label: "06/02", totalExpense: 32000, totalIncome: 0 },
        { label: "06/09", totalExpense: 28000, totalIncome: 0 },
        { label: "06/16", totalExpense: 35000, totalIncome: 0 },
        { label: "06/23", totalExpense: 30000, totalIncome: 300000 },
        { label: "06/30", totalExpense: 41000, totalIncome: 0 },
      ],
    };
  }

  return {
    unit,
    points: [
      { label: "2024/1", totalExpense: 150000, totalIncome: 300000 },
      { label: "2024/2", totalExpense: 130000, totalIncome: 300000 },
      { label: "2024/3", totalExpense: 160000, totalIncome: 300000 },
      { label: "2024/4", totalExpense: 145000, totalIncome: 300000 },
      { label: "2024/5", totalExpense: 170000, totalIncome: 300000 },
    ],
  };
}

let migrationsApplied = false;

function mockHandleRunMigrations() {
  if (migrationsApplied) {
    return { results: [], appliedCount: 0 };
  }
  migrationsApplied = true;

  return {
    results: [
      {
        id: "001_normalize_raw_data_amount",
        description: "raw_dataのamount列に残っている文字列（クォート・カンマ付き）を数値に正規化する",
        success: true,
        result: { updated: 3 },
      },
    ],
    appliedCount: 1,
  };
}

const DEFAULT_MOCK_PROMPT =
  "あなたは家計管理のアドバイザーです。以下の支出データを分析し、具体的で実行可能なアドバイスを日本語で提供してください。";
const MOCK_SETTINGS_STORAGE_KEY = "__mock_settings__";

// 実際のGASでは設定はスプレッドシートに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function loadMockSettings(): Settings {
  const raw = sessionStorage.getItem(MOCK_SETTINGS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Settings;
    } catch {
      // 壊れたデータは無視してデフォルトにフォールバック
    }
  }
  return { prompt: DEFAULT_MOCK_PROMPT, model: "" };
}

function mockHandleGetSettings() {
  return loadMockSettings();
}

function mockHandleUpdateSettings(body: { prompt?: string; model?: string }) {
  const settings: Settings = {
    prompt: body.prompt?.trim() || DEFAULT_MOCK_PROMPT,
    model: body.model?.trim() ?? "",
  };
  sessionStorage.setItem(MOCK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return { success: true };
}

const MOCK_PREFERENCE_KEYS: PreferenceKey[] = ["theme", "dashboardLayout", "trendVisibleCount"];
const MOCK_PREFERENCE_STORAGE_PREFIX = "__mock_preference_";

// 実際のGASではUserPropertiesに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function mockHandleGetPreferences() {
  const preferences: Record<PreferenceKey, string> = { theme: "", dashboardLayout: "", trendVisibleCount: "" };
  MOCK_PREFERENCE_KEYS.forEach((key) => {
    preferences[key] = sessionStorage.getItem(`${MOCK_PREFERENCE_STORAGE_PREFIX}${key}`) ?? "";
  });
  return preferences;
}

function mockHandleUpdatePreference(body: UpdatePreferenceParams) {
  if (!MOCK_PREFERENCE_KEYS.includes(body.key)) {
    return { success: false, error: "invalid key" };
  }
  sessionStorage.setItem(`${MOCK_PREFERENCE_STORAGE_PREFIX}${body.key}`, String(body.value));
  return { success: true };
}

function mockHandleAiAdvice(params: SummaryParams) {
  const summary = mockHandleSummary(params);
  const hasData = summary.categories.length > 0 || summary.totalExpense > 0 || summary.totalIncome > 0;

  if (!hasData) {
    return { success: false, error: "指定した期間のデータがありません" };
  }

  return {
    success: true,
    advice:
      "今月の支出は先月より10%増加しています。特に食費が増加傾向にあります。外食を減らし、自炊を心がけることで月2万円程度の節約が見込めます。",
  };
}

const MOCK_TRANSACTION_CATEGORY_ENTRIES: [string, string[]][] = [
  ["食費", ["外食", "スーパー", "コンビニ"]],
  ["交通費", ["電車", "バス", "タクシー"]],
  ["娯楽", ["映画", "書籍"]],
  ["光熱費", ["電気", "ガス", "水道"]],
  ["その他", ["雑費"]],
  ["給与", ["給与"]],
];
// カテゴリマスタはhandleAddCategoryで追加されるため、モジュール内メモリでミュータブルに保持する
const mockCategoriesMaster: Record<string, string[]> = Object.fromEntries(
  MOCK_TRANSACTION_CATEGORY_ENTRIES.map(([category, subcategories]) => [category, [...subcategories]]),
);

// カテゴリ・メモの編集はページリロードをまたがなくてよいため、モジュール内メモリで十分
const mockCategoryOverrides = new Map<string, { category: string; subcategory: string; memo: string }>();

function buildMockTransactions(year: number, month: number): TransactionRow[] {
  const count = 55; // ページネーション（1ページ50件）を跨ぐ件数にする

  return Array.from({ length: count }, (_, i) => {
    const day = (i % 28) + 1;
    const [category, subcategories] = MOCK_TRANSACTION_CATEGORY_ENTRIES[i % MOCK_TRANSACTION_CATEGORY_ENTRIES.length]!;
    const subcategory = subcategories[i % subcategories.length]!;
    const isIncome = category === "給与";
    const id = `${year}-${String(month).padStart(2, "0")}-${i}`;

    return {
      id,
      date: `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
      content: isIncome ? "給与振込" : `店舗${i}`,
      amount: isIncome ? 280000 : -(1000 + i * 37),
      institution: i % 2 === 0 ? "楽天カード" : "住信SBIネット銀行",
      category,
      subcategory,
      memo: "",
    };
  });
}

function mockHandleTransactionList(params: TransactionListParams) {
  const { year, month, page, pageSize } = params;

  if (getScenario().transactionListEmpty) {
    return {
      transactions: [],
      totalCount: 0,
      page,
      pageSize,
      categoryOptions: [],
      subcategoryOptionsByCategory: {},
    };
  }

  const transactions = buildMockTransactions(year, month).map((t) => {
    const override = mockCategoryOverrides.get(t.id);
    return override
      ? { ...t, category: override.category, subcategory: override.subcategory, memo: override.memo }
      : t;
  });

  const totalCount = transactions.length;
  const offset = (page - 1) * pageSize;

  return {
    transactions: transactions.slice(offset, offset + pageSize),
    totalCount,
    page,
    pageSize,
    categoryOptions: Object.keys(mockCategoriesMaster),
    subcategoryOptionsByCategory: mockCategoriesMaster,
  };
}

function mockHandleUpdateCategory(body: UpdateCategoryParams) {
  if (!body.id) {
    return { success: false, error: "id is required" };
  }

  mockCategoryOverrides.set(body.id, { category: body.category, subcategory: body.subcategory, memo: body.memo });
  return { success: true };
}

function mockHandleGetCategories() {
  return { categories: mockCategoriesMaster };
}

function mockHandleAddCategory(body: AddCategoryParams) {
  const category = body.category?.trim();
  const subcategory = body.subcategory?.trim();

  if (!category || !subcategory) {
    return { success: false, error: "category and subcategory are required" };
  }

  if (!mockCategoriesMaster[category]) {
    mockCategoriesMaster[category] = [];
  }
  if (!mockCategoriesMaster[category].includes(subcategory)) {
    mockCategoriesMaster[category].push(subcategory);
  }

  return { success: true };
}

function callMockFunction(functionName: string, args: unknown[]): unknown {
  switch (functionName) {
    case "handleUpload":
      return mockHandleUpload(args[0] as { csv: string });
    case "handleSummary":
      return mockHandleSummary(args[0] as SummaryParams);
    case "handleTrend":
      return mockHandleTrend(args[0] as TrendParams);
    case "handleMonthlyCalendar":
      return mockHandleMonthlyCalendar(args[0] as MonthlyCalendarParams);
    case "handleAiAdvice":
      return mockHandleAiAdvice(args[0] as SummaryParams);
    case "handleRunMigrations":
      return mockHandleRunMigrations();
    case "handleGetSettings":
      return mockHandleGetSettings();
    case "handleUpdateSettings":
      return mockHandleUpdateSettings(args[0] as { prompt?: string; model?: string });
    case "handleGetPreferences":
      return mockHandleGetPreferences();
    case "handleUpdatePreference":
      return mockHandleUpdatePreference(args[0] as UpdatePreferenceParams);
    case "handleTransactionList":
      return mockHandleTransactionList(args[0] as TransactionListParams);
    case "handleUpdateCategory":
      return mockHandleUpdateCategory(args[0] as UpdateCategoryParams);
    case "handleGetCategories":
      return mockHandleGetCategories();
    case "handleAddCategory":
      return mockHandleAddCategory(args[0] as AddCategoryParams);
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

function createRunProxy(
  successHandler?: (result: unknown) => void,
  failureHandler?: (error: Error) => void,
): ScriptRun {
  return new Proxy({} as ScriptRun, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;

      if (prop === "withSuccessHandler") {
        return (cb: (result: unknown) => void) => createRunProxy(cb, failureHandler);
      }
      if (prop === "withFailureHandler") {
        return (cb: (error: Error) => void) => createRunProxy(successHandler, cb);
      }

      return (...args: unknown[]) => {
        setTimeout(() => {
          try {
            const result = callMockFunction(prop, args);
            successHandler?.(result);
          } catch (err) {
            failureHandler?.(err instanceof Error ? err : new Error(String(err)));
          }
        }, 0);
      };
    },
  });
}

export function installGoogleScriptRunMock() {
  const win = window as unknown as { google?: { script?: { run?: ScriptRun } } };
  win.google = { script: { run: createRunProxy() } };
}
