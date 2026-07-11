interface ScriptRun {
  withSuccessHandler(cb: (result: unknown) => void): ScriptRun;
  withFailureHandler(cb: (error: Error) => void): ScriptRun;
  [functionName: string]: unknown;
}

interface MockScenario {
  trendEmpty?: boolean;
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

function mockHandleSummary(params: { year: number; month: number }) {
  const year = Number(params.year);
  const month = Number(params.month);

  // MonthSelectorが選択肢に出す最古の月（24ヶ月前）をデータなしケースとして扱う
  const now = new Date();
  const oldest = new Date(now.getFullYear(), now.getMonth() - 23, 1);
  const isOldestMonth = year === oldest.getFullYear() && month === oldest.getMonth() + 1;

  if (isOldestMonth) {
    return { year, month, totalExpense: 0, totalIncome: 0, categories: [] };
  }

  return {
    year,
    month,
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

function mockHandleTrend() {
  if (getScenario().trendEmpty) {
    return { months: [] };
  }

  return {
    months: [
      { year: 2024, month: 1, totalExpense: 150000, totalIncome: 300000 },
      { year: 2024, month: 2, totalExpense: 130000, totalIncome: 300000 },
      { year: 2024, month: 3, totalExpense: 160000, totalIncome: 300000 },
      { year: 2024, month: 4, totalExpense: 145000, totalIncome: 300000 },
      { year: 2024, month: 5, totalExpense: 170000, totalIncome: 300000 },
    ],
  };
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
      return mockHandleSummary(args[0] as { year: number; month: number });
    case "handleTrend":
      return mockHandleTrend();
    case "handleAiAdvice":
      return mockHandleAiAdvice(args[0] as { context: string });
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
