import type { Settings, SummaryParams, SummaryUnit, TrendParams, TrendPoint } from "../types/api";

interface ScriptRun {
  withSuccessHandler(cb: (result: unknown) => void): ScriptRun;
  withFailureHandler(cb: (error: Error) => void): ScriptRun;
  [functionName: string]: unknown;
}

interface MockScenario {
  trendEmpty?: boolean;
  trendManyPoints?: boolean;
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

function mockHandleSummary(params: SummaryParams) {
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
    };
  }

  const year = Number(params.year);
  const month = Number(params.month);

  // MonthSelectorが選択肢に出す最古の月（24ヶ月前）をデータなしケースとして扱う
  const now = new Date();
  const oldest = new Date(now.getFullYear(), now.getMonth() - 23, 1);
  const isOldestMonth = year === oldest.getFullYear() && month === oldest.getMonth() + 1;

  if (isOldestMonth) {
    return {
      unit: "month" as const,
      year,
      month,
      label: `${year}年${month}月`,
      totalExpense: 0,
      totalIncome: 0,
      categories: [],
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

function mockHandleAiAdvice(body: { context: string }) {
  if (!body.context) {
    return { success: false, error: "context field is required" };
  }

  return {
    success: true,
    advice:
      "今月の支出は先月より10%増加しています。特に食費が増加傾向にあります。外食を減らし、自炊を心がけることで月2万円程度の節約が見込めます。",
  };
}

function callMockFunction(functionName: string, args: unknown[]): unknown {
  switch (functionName) {
    case "handleUpload":
      return mockHandleUpload(args[0] as { csv: string });
    case "handleSummary":
      return mockHandleSummary(args[0] as SummaryParams);
    case "handleTrend":
      return mockHandleTrend(args[0] as TrendParams);
    case "handleAiAdvice":
      return mockHandleAiAdvice(args[0] as { context: string });
    case "handleRunMigrations":
      return mockHandleRunMigrations();
    case "handleGetSettings":
      return mockHandleGetSettings();
    case "handleUpdateSettings":
      return mockHandleUpdateSettings(args[0] as { prompt?: string; model?: string });
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
