import type {
  AddAiAttributeParams,
  AddAiMemoryParams,
  AddCategoryParams,
  AiAttribute,
  AiCategorySuggestion,
  AiCategorySuggestionParams,
  AiChatSession,
  AiMemory,
  AiToolCall,
  ApplyAiCategorySuggestionsParams,
  ApplyTodoActionsParams,
  Budget,
  CalendarDay,
  ChatTurn,
  ContinueAiChatParams,
  CostType,
  Decision,
  GetDecisionsParams,
  DeleteAiAttributeParams,
  DeleteAiMemoryParams,
  DeleteBudgetParams,
  DeleteCategoryParams,
  DeleteCategoryPairParams,
  GetBudgetVarianceParams,
  Goals,
  SavingsTargetMode,
  UpdateGoalsParams,
  MonthlyCalendarParams,
  PreferenceKey,
  RenameCategoryParams,
  SaveAiChatSessionParams,
  Settings,
  StartAiChatParams,
  SummarizeAiInsightParams,
  SummaryParams,
  SummaryUnit,
  TodoAction,
  TransactionListParams,
  TransactionRow,
  TrendParams,
  TrendPoint,
  UpdateAiAttributeParams,
  UpdateCategoryCostTypeParams,
  UpdateCategoryParams,
  UpdateCategoryPairParams,
  UpdatePreferenceParams,
  UpsertBudgetParams,
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
  aiCategorySuggestionsEmpty?: boolean;
  aiCategorySuggestionsError?: boolean;
  aiCategorySuggestionsWithNewCategory?: boolean;
  aiChatError?: boolean;
  aiContinueChatError?: boolean;
  aiSaveSessionError?: boolean;
}

function getScenario(): MockScenario {
  const value = (window as unknown as { __MOCK_SCENARIO__?: MockScenario }).__MOCK_SCENARIO__;
  return value ?? {};
}

function mockHandleUpload(body: { csv: string; overwriteCategory?: boolean }) {
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
    const formattedDate = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;

    totalExpense += dayExpense;
    totalIncome += dayIncome;

    const transactions =
      dayExpense > 0 || dayIncome > 0
        ? [
            ...(dayExpense > 0 ? [{ content: `店舗${day}`, date: formattedDate, amount: -dayExpense }] : []),
            ...(dayIncome > 0 ? [{ content: "給与振込", date: formattedDate, amount: dayIncome }] : []),
          ]
        : [];

    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      dayOfWeek: date.getDay(),
      totalExpense: dayExpense,
      totalIncome: dayIncome,
      balance: dayIncome - dayExpense,
      transactions,
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
const DEFAULT_MOCK_AGENDA_TOPICS = [
  "今月のざっくり振り返り",
  "使途不明金をあぶり出したい",
  "固定費の歪みをチェックして",
  "来月の予算作りの作戦会議",
].join("\n");
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
  return { prompt: DEFAULT_MOCK_PROMPT, model: "", agendaTopics: DEFAULT_MOCK_AGENDA_TOPICS };
}

function mockHandleGetSettings() {
  return loadMockSettings();
}

function mockHandleUpdateSettings(body: { prompt?: string; model?: string; agendaTopics?: string }) {
  const settings: Settings = {
    prompt: body.prompt?.trim() || DEFAULT_MOCK_PROMPT,
    model: body.model?.trim() ?? "",
    agendaTopics: body.agendaTopics?.trim() || DEFAULT_MOCK_AGENDA_TOPICS,
  };
  sessionStorage.setItem(MOCK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return { success: true };
}

const MOCK_AI_ATTRIBUTES_STORAGE_KEY = "__mock_ai_attributes__";

// 実際のGASではai_attributesシートに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function loadMockAiAttributes(): AiAttribute[] {
  const raw = sessionStorage.getItem(MOCK_AI_ATTRIBUTES_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AiAttribute[];
    } catch {
      // 壊れたデータは無視してデフォルトにフォールバック
    }
  }
  return [];
}

function saveMockAiAttributes(attributes: AiAttribute[]) {
  sessionStorage.setItem(MOCK_AI_ATTRIBUTES_STORAGE_KEY, JSON.stringify(attributes));
}

function mockHandleGetAiAttributes() {
  return { attributes: loadMockAiAttributes() };
}

function mockHandleAddAiAttribute(body: AddAiAttributeParams) {
  const key = body.key?.trim();
  const value = body.value?.trim();
  if (!key || !value) {
    return { success: false, error: "key and value are required" };
  }

  const attribute: AiAttribute = { id: crypto.randomUUID(), key, value };
  const attributes = loadMockAiAttributes();
  attributes.push(attribute);
  saveMockAiAttributes(attributes);
  return { success: true, attribute };
}

function mockHandleUpdateAiAttribute(body: UpdateAiAttributeParams) {
  const key = body.key?.trim();
  const value = body.value?.trim();
  if (!key || !value) {
    return { success: false, error: "key and value are required" };
  }

  const attributes = loadMockAiAttributes();
  const existing = attributes.find((a) => a.id === body.id);
  if (!existing) {
    return { success: false, error: "attribute not found" };
  }

  existing.key = key;
  existing.value = value;
  saveMockAiAttributes(attributes);
  return { success: true };
}

function mockHandleDeleteAiAttribute(body: DeleteAiAttributeParams) {
  const attributes = loadMockAiAttributes().filter((a) => a.id !== body.id);
  saveMockAiAttributes(attributes);
  return { success: true };
}

const MOCK_AI_MEMORY_STORAGE_KEY = "__mock_ai_memory__";

// 実際のGASではai_memoryシートに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function loadMockAiMemories(): AiMemory[] {
  const raw = sessionStorage.getItem(MOCK_AI_MEMORY_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AiMemory[];
    } catch {
      // 壊れたデータは無視してデフォルトにフォールバック
    }
  }
  return [];
}

function saveMockAiMemories(memories: AiMemory[]) {
  sessionStorage.setItem(MOCK_AI_MEMORY_STORAGE_KEY, JSON.stringify(memories));
}

function mockHandleGetAiMemories() {
  return { memories: loadMockAiMemories() };
}

function mockHandleAddAiMemory(body: AddAiMemoryParams) {
  const content = body.content?.trim();
  if (!content) {
    return { success: false, error: "content is required" };
  }
  if (body.type === "categoryPattern" && (!body.category?.trim() || !body.subcategory?.trim())) {
    return { success: false, error: "category and subcategory are required for categoryPattern" };
  }

  const memory: AiMemory = {
    id: crypto.randomUUID(),
    type: body.type,
    content,
    category: body.category?.trim() ?? "",
    subcategory: body.subcategory?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
  const memories = loadMockAiMemories();
  memories.push(memory);
  saveMockAiMemories(memories);
  return { success: true, memory };
}

function mockHandleDeleteAiMemory(body: DeleteAiMemoryParams) {
  const memories = loadMockAiMemories().filter((m) => m.id !== body.id);
  saveMockAiMemories(memories);
  return { success: true };
}

function mockHandleSummarizeAiInsight(body: SummarizeAiInsightParams) {
  const text = body.text?.trim();
  if (!text) {
    return { success: false, error: "text is required" };
  }

  const summary = text.length > 40 ? `${text.slice(0, 40)}…` : text;
  return { success: true, summary };
}

function mockHandleConsolidateAiMemoryInsights() {
  const memories = loadMockAiMemories();
  const insights = memories.filter((m) => m.type === "insight");
  if (insights.length < 2) {
    return { success: true, changed: false, memories };
  }

  const consolidated: AiMemory = {
    id: crypto.randomUUID(),
    type: "insight",
    content: `${insights.length}件の気づきを1件に整理しました`,
    category: "",
    subcategory: "",
    createdAt: new Date().toISOString(),
  };

  const newMemories = [...memories.filter((m) => m.type !== "insight"), consolidated];
  saveMockAiMemories(newMemories);
  return { success: true, changed: true, memories: newMemories };
}

const MOCK_PREFERENCE_KEYS: PreferenceKey[] = ["theme", "trendVisibleCount"];
const MOCK_PREFERENCE_STORAGE_PREFIX = "__mock_preference_";

// 実際のGASではUserPropertiesに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function mockHandleGetPreferences() {
  const preferences: Record<PreferenceKey, string> = { theme: "", trendVisibleCount: "" };
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

// 台本形式の対話モック。すでに完了したモデルターン数から次の応答を決定する
function mockChatTurn(modelTurnCount: number) {
  if (modelTurnCount === 0) {
    return {
      ai_message: "今月は先月より支出が増えていますね。何か思い当たることはありますか？",
      quick_replies: ["外食が増えたかも", "特に思い当たらない"],
      is_final: false,
      todo_actions: [] as TodoAction[],
      category_suggestions: [] as AiCategorySuggestion[],
      // 実際のGASではrunAiAgent_が呼んだツールの記録が入る
      tool_calls: [
        { name: "get_summary", label: "2025年12月の収支を確認" },
        { name: "get_trend", label: "月次の推移を確認" },
      ] as AiToolCall[],
    };
  }
  if (modelTurnCount === 1) {
    // GAS側のnormalizeAiText_を通った後を再現する。見出し・箇条書きが
    // Markdownとして描画されること、\nが文字として残らないことを検証できる
    return {
      ai_message:
        "なるほど、外食が増えているんですね。来月はどうしたいですか？\n\n## 気になった点\n\n- 外食費が先月より1万円増えている\n- 一方で**食費全体**は横ばい\n\n" +
        "| 項目 | 今月 | 先月 |\n| --- | --- | --- |\n| 外食費 | 30,000円 | 20,000円 |\n| 食費全体 | 40,000円 | 40,000円 |",
      quick_replies: ["来月は減らしたい", "このままでいい"],
      is_final: false,
      todo_actions: [] as TodoAction[],
      // 明細を見ていて分類ミスに気づいた、という想定のサンプル
      category_suggestions: [
        {
          id: "2025-12-4",
          date: "2025/12/05",
          content: "店舗4",
          amount: -1148,
          institution: "楽天カード",
          currentCategory: "その他",
          currentSubcategory: "雑費",
          suggestedCategory: "食費",
          suggestedSubcategory: "外食",
          isNewCategory: false,
          reason: "内容から外食と思われる",
        },
      ] as AiCategorySuggestion[],
      tool_calls: [
        { name: "get_transactions", label: "2025年12月の明細（10,000円以上）を確認" },
      ] as AiToolCall[],
    };
  }
  if (modelTurnCount >= 3) {
    // 見直し案が出た後の追加質問。新たな見直し案は出さず、質問にだけ答える
    return {
      ai_message: "交通費の平均は月58,000円だよ。定期代が含まれているから、予算化しても無理はないはず。",
      quick_replies: [] as string[],
      is_final: true,
      todo_actions: [] as TodoAction[],
      category_suggestions: [] as AiCategorySuggestion[],
      tool_calls: [{ name: "get_summary", label: "2025年12月の収支を確認" }] as AiToolCall[],
    };
  }
  return {
    ai_message: "では食費の予算を見直しましょう。来月は35,000円を目安にしてみましょう。",
    quick_replies: [] as string[],
    is_final: true,
    // 予算・貯蓄目標・特別費積立の3種別がそれぞれ正しく反映されることを検証できるようにする
    todo_actions: [
      { type: "budget", category: "食費", amount: 35000, reason: "外食の頻度を月2回に抑えるため" },
      { type: "savingsTarget", amount: 100000, reason: "支出削減分をそのまま貯蓄に回すため" },
      { type: "specialReserve", amount: 15000, reason: "年末の帰省費を月割りで備えるため" },
    ] as TodoAction[],
    category_suggestions: [] as AiCategorySuggestion[],
    // 追加でデータを見る必要がなかったターンはツール呼び出しなしになる
    tool_calls: [] as AiToolCall[],
  };
}

function mockHandleStartAiChat(body: StartAiChatParams) {
  if (getScenario().aiChatError) {
    return { success: false, error: "GEMINI_API_KEY is not set in script properties" };
  }

  // 履歴はGeminiのcontents形式。実際のGASではツール呼び出しのやり取りも含まれる
  const initialPrompt = `agenda:${body.agendaTopic}`;
  const turn = mockChatTurn(0);
  const history: ChatTurn[] = [
    { role: "user", parts: [{ text: initialPrompt }] },
    { role: "model", parts: [{ functionCall: { name: "respond_to_user", args: turn } }] },
  ];
  return { success: true, ...turn, history };
}

function mockHandleContinueAiChat(body: ContinueAiChatParams) {
  if (getScenario().aiContinueChatError) {
    return { success: false, error: "Gemini API request failed" };
  }

  const modelTurnCount = body.history.filter((h) => h.role === "model").length;
  const turn = mockChatTurn(modelTurnCount);
  const history: ChatTurn[] = body.history.concat([
    { role: "user", parts: [{ text: body.userReply }] },
    { role: "model", parts: [{ functionCall: { name: "respond_to_user", args: turn } }] },
  ]);
  return { success: true, ...turn, history };
}

const MOCK_AI_CHAT_SESSION_STORAGE_KEY = "__mock_ai_chat_session__";

// 実際のGASではai_chat_sessionシートに永続化される（常に直近1件のみ）ため、
// モックでもページリロードをまたいで再現できるよう sessionStorage に保存する
function loadMockAiChatSession(): AiChatSession | null {
  const raw = sessionStorage.getItem(MOCK_AI_CHAT_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AiChatSession;
  } catch {
    return null;
  }
}

function mockHandleGetAiChatSession() {
  return { session: loadMockAiChatSession() };
}

function mockHandleSaveAiChatSession(body: SaveAiChatSessionParams) {
  if (getScenario().aiSaveSessionError) {
    return { success: false, error: "セルの文字数上限を超えています" };
  }
  sessionStorage.setItem(MOCK_AI_CHAT_SESSION_STORAGE_KEY, JSON.stringify(body.session));
  return { success: true };
}

function mockHandleClearAiChatSession() {
  sessionStorage.removeItem(MOCK_AI_CHAT_SESSION_STORAGE_KEY);
  return { success: true };
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
const mockCategoryOverrides = new Map<
  string,
  { category: string; subcategory: string; memo: string; locked: boolean }
>();

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
      locked: false,
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
      ? {
          ...t,
          category: override.category,
          subcategory: override.subcategory,
          memo: override.memo,
          locked: override.locked,
        }
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

  mockCategoryOverrides.set(body.id, {
    category: body.category,
    subcategory: body.subcategory,
    memo: body.memo,
    locked: !!body.locked,
  });
  return { success: true };
}

function mockHandleGetAiCategorySuggestions(params: AiCategorySuggestionParams) {
  if (getScenario().aiCategorySuggestionsError) {
    return {
      success: false,
      suggestions: [],
      targetCount: 0,
      error: "GEMINI_API_KEY is not set in script properties",
    };
  }
  if (getScenario().aiCategorySuggestionsEmpty) {
    return { success: true, suggestions: [], targetCount: 0 };
  }

  // scopeに関わらず先頭を固定の提案対象とする（実際の空欄判定はGAS側の責務のためモックでは簡略化）
  let targets = buildMockTransactions(params.year, params.month);

  if (params.institutionKeyword) {
    targets = targets.filter((t) => t.institution.includes(params.institutionKeyword!));
  }
  if (params.contentKeyword) {
    targets = targets.filter((t) => t.content.includes(params.contentKeyword!));
  }
  if (params.categoryFilter && params.categoryFilter.length > 0) {
    const keys = new Set(params.categoryFilter.map((f) => `${f.category} ${f.subcategory}`));
    targets = targets.filter((t) => keys.has(`${t.category} ${t.subcategory}`));
  }
  if (params.amountMin || params.amountMax) {
    targets = targets.filter((t) => {
      if (t.amount >= 0) return false;
      const absAmount = Math.abs(t.amount);
      if (params.amountMin && absAmount < params.amountMin) return false;
      if (params.amountMax && absAmount > params.amountMax) return false;
      return true;
    });
  }

  targets = targets.slice(0, 5);

  const withNewCategory = getScenario().aiCategorySuggestionsWithNewCategory;

  const suggestions = targets.map((t, i) => {
    const isNewCategory = withNewCategory && i === 0;
    return {
      id: t.id,
      date: t.date,
      content: t.content,
      amount: t.amount,
      institution: t.institution,
      currentCategory: t.category,
      currentSubcategory: t.subcategory,
      suggestedCategory: isNewCategory ? "新規テスト大項目" : "娯楽",
      suggestedSubcategory: isNewCategory ? "新規テスト中項目" : "映画",
      isNewCategory: !!isNewCategory,
      reason: "内容と金額のパターンから推定しました",
    };
  });

  return { success: true, suggestions, targetCount: suggestions.length };
}

function mockHandleApplyAiCategorySuggestions(body: ApplyAiCategorySuggestionsParams) {
  body.suggestions.forEach((s) => {
    const prev = mockCategoryOverrides.get(s.id);
    mockCategoryOverrides.set(s.id, {
      category: s.category,
      subcategory: s.subcategory,
      memo: prev?.memo ?? "",
      locked: true,
    });
  });
  return { success: true, applied: body.suggestions.length, notFound: 0 };
}

// 費目区分は大項目単位。実際のGASではcategoriesシートのcostType列に保持される
const mockCostTypes: Record<string, CostType> = { 住居: "fixed", 光熱費: "fixed", 通信費: "fixed" };

function mockHandleGetCategories() {
  return { categories: mockCategoriesMaster, costTypes: mockCostTypes };
}

function mockHandleUpdateCategoryCostType(body: UpdateCategoryCostTypeParams) {
  const category = body.category?.trim();
  if (!category) {
    return { success: false, error: "category is required" };
  }
  if (body.costType !== "fixed" && body.costType !== "variable") {
    return { success: false, error: "costType must be 'fixed' or 'variable'" };
  }
  if (!mockCategoriesMaster[category]) {
    return { success: false, error: "category not found" };
  }

  mockCostTypes[category] = body.costType;
  return { success: true };
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

function mockHandleRenameCategory(body: RenameCategoryParams) {
  const oldCategory = body.oldCategory?.trim();
  const newCategory = body.newCategory?.trim();

  if (!oldCategory || !newCategory) {
    return { success: false, error: "oldCategory and newCategory are required" };
  }
  if (oldCategory === newCategory) {
    return { success: true };
  }

  const subcategories = mockCategoriesMaster[oldCategory];
  if (subcategories) {
    delete mockCategoriesMaster[oldCategory];
    mockCategoriesMaster[newCategory] = subcategories;
  }

  const budgets = loadMockBudgets();
  const budget = budgets.find((b) => b.category === oldCategory);
  if (budget) {
    budget.category = newCategory;
    saveMockBudgets(budgets);
  }

  return { success: true };
}

function mockHandleDeleteCategory(body: DeleteCategoryParams) {
  const category = body.category?.trim();
  if (!category) {
    return { success: false, error: "category is required" };
  }

  delete mockCategoriesMaster[category];
  saveMockBudgets(loadMockBudgets().filter((b) => b.category !== category));

  return { success: true };
}

function mockHandleUpdateCategoryPair(body: UpdateCategoryPairParams) {
  const oldCategory = body.oldCategory?.trim();
  const oldSubcategory = body.oldSubcategory?.trim();
  const newCategory = body.newCategory?.trim();
  const newSubcategory = body.newSubcategory?.trim();

  if (!oldCategory || !oldSubcategory || !newCategory || !newSubcategory) {
    return { success: false, error: "oldCategory, oldSubcategory, newCategory and newSubcategory are required" };
  }
  if (oldCategory === newCategory && oldSubcategory === newSubcategory) {
    return { success: true };
  }

  const oldSubcategories = mockCategoriesMaster[oldCategory];
  if (!oldSubcategories || !oldSubcategories.includes(oldSubcategory)) {
    return { success: false, error: "category pair not found" };
  }

  const duplicateExists = (mockCategoriesMaster[newCategory] ?? []).includes(newSubcategory);
  if (duplicateExists && !(oldCategory === newCategory && oldSubcategory === newSubcategory)) {
    return { success: false, error: "category pair already exists" };
  }

  mockCategoriesMaster[oldCategory] = oldSubcategories.filter((s) => s !== oldSubcategory);
  if (mockCategoriesMaster[oldCategory].length === 0) {
    delete mockCategoriesMaster[oldCategory];
  }

  if (!mockCategoriesMaster[newCategory]) {
    mockCategoriesMaster[newCategory] = [];
  }
  mockCategoriesMaster[newCategory].push(newSubcategory);

  return { success: true };
}

function mockHandleDeleteCategoryPair(body: DeleteCategoryPairParams) {
  const category = body.category?.trim();
  const subcategory = body.subcategory?.trim();
  if (!category || !subcategory) {
    return { success: false, error: "category and subcategory are required" };
  }

  const subcategories = mockCategoriesMaster[category];
  if (subcategories) {
    mockCategoriesMaster[category] = subcategories.filter((s) => s !== subcategory);
    if (mockCategoriesMaster[category].length === 0) {
      delete mockCategoriesMaster[category];
    }
  }

  return { success: true };
}

const MOCK_BUDGETS_STORAGE_KEY = "__mock_budgets__";

// 実際のGASではbudgetsシートに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function loadMockBudgets(): Budget[] {
  const raw = sessionStorage.getItem(MOCK_BUDGETS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Budget[];
    } catch {
      // 壊れたデータは無視してデフォルトにフォールバック
    }
  }
  return [];
}

function saveMockBudgets(budgets: Budget[]) {
  sessionStorage.setItem(MOCK_BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
}

function mockHandleGetBudgets() {
  return { budgets: loadMockBudgets() };
}

function mockHandleGetBudgetVariance(params: GetBudgetVarianceParams) {
  const summary = mockHandleSummary({ unit: "month", year: params.year, month: params.month });
  const budgets = loadMockBudgets();
  const actualByCategory: Record<string, number> = {};
  summary.categories.forEach((c) => {
    actualByCategory[c.name] = c.total;
  });

  const entries = budgets.map(({ category, monthlyBudget }) => {
    const actual = actualByCategory[category] || 0;
    return { category, budget: monthlyBudget, actual, variance: actual - monthlyBudget };
  });

  return { unit: "month" as const, year: params.year, month: params.month, label: summary.label, entries };
}

function mockHandleUpsertBudget(body: UpsertBudgetParams) {
  const category = body.category?.trim();
  const monthlyBudget = Number(body.monthlyBudget);

  if (!category) {
    return { success: false, error: "category is required" };
  }
  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
    return { success: false, error: "monthlyBudget must be a non-negative number" };
  }

  if (!mockCategoriesMaster[category]) {
    mockCategoriesMaster[category] = ["未分類"];
  }

  const budgets = loadMockBudgets();
  const existing = budgets.find((b) => b.category === category);
  const beforeAmount = existing ? existing.monthlyBudget : null;
  if (existing) {
    existing.monthlyBudget = monthlyBudget;
  } else {
    budgets.push({ category, monthlyBudget });
  }
  saveMockBudgets(budgets);

  recordMockDecision({
    source: body.source ?? "manual",
    type: "budget",
    target: category,
    beforeAmount,
    afterAmount: monthlyBudget,
    reason: body.reason ?? "",
  });

  return { success: true, budget: { category, monthlyBudget } };
}

function mockHandleDeleteBudget(body: DeleteBudgetParams) {
  saveMockBudgets(loadMockBudgets().filter((b) => b.category !== body.category));
  return { success: true };
}

const MOCK_GOALS_STORAGE_KEY = "__mock_goals__";

const DEFAULT_MOCK_GOALS = {
  monthlyIncome: 0,
  savingsTargetMode: "amount" as SavingsTargetMode,
  savingsTargetAmount: 0,
  savingsTargetRate: 0,
  specialReserveAmount: 0,
};

type StoredGoals = typeof DEFAULT_MOCK_GOALS;

// 実際のGASではgoalsシートに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function loadMockGoals(): StoredGoals {
  const raw = sessionStorage.getItem(MOCK_GOALS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as StoredGoals;
    } catch {
      // 壊れたデータは無視してデフォルトにフォールバック
    }
  }
  return { ...DEFAULT_MOCK_GOALS };
}

// GAS側のresolveSavingsTarget_と同じ計算をモックでも再現する
function resolveMockGoals(stored: StoredGoals): Goals {
  const resolvedSavingsTarget =
    stored.savingsTargetMode === "rate"
      ? Math.round((stored.monthlyIncome * stored.savingsTargetRate) / 100)
      : stored.savingsTargetAmount;

  return {
    ...stored,
    resolvedSavingsTarget,
    spendableTotal: stored.monthlyIncome - resolvedSavingsTarget - stored.specialReserveAmount,
  };
}

function mockHandleGetGoals() {
  return resolveMockGoals(loadMockGoals());
}

function mockHandleUpdateGoals(body: UpdateGoalsParams) {
  const stored = loadMockGoals();
  const before = resolveMockGoals(stored);

  if (body.monthlyIncome !== undefined) {
    if (!Number.isFinite(body.monthlyIncome) || body.monthlyIncome < 0) {
      return { success: false, error: "monthlyIncome must be a non-negative number" };
    }
    stored.monthlyIncome = body.monthlyIncome;
  }
  if (body.savingsTargetMode !== undefined) {
    stored.savingsTargetMode = body.savingsTargetMode;
  }
  if (body.savingsTargetAmount !== undefined) {
    if (!Number.isFinite(body.savingsTargetAmount) || body.savingsTargetAmount < 0) {
      return { success: false, error: "savingsTargetAmount must be a non-negative number" };
    }
    stored.savingsTargetAmount = body.savingsTargetAmount;
  }
  if (body.savingsTargetRate !== undefined) {
    if (!Number.isFinite(body.savingsTargetRate) || body.savingsTargetRate < 0 || body.savingsTargetRate > 100) {
      return { success: false, error: "savingsTargetRate must be between 0 and 100" };
    }
    stored.savingsTargetRate = body.savingsTargetRate;
  }
  if (body.specialReserveAmount !== undefined) {
    if (!Number.isFinite(body.specialReserveAmount) || body.specialReserveAmount < 0) {
      return { success: false, error: "specialReserveAmount must be a non-negative number" };
    }
    stored.specialReserveAmount = body.specialReserveAmount;
  }

  sessionStorage.setItem(MOCK_GOALS_STORAGE_KEY, JSON.stringify(stored));

  const after = resolveMockGoals(stored);
  const source = body.source ?? "manual";
  const reason = body.reason ?? "";
  recordMockDecision({
    source,
    type: "savingsTarget",
    target: "",
    beforeAmount: before.resolvedSavingsTarget,
    afterAmount: after.resolvedSavingsTarget,
    reason,
  });
  recordMockDecision({
    source,
    type: "specialReserve",
    target: "",
    beforeAmount: before.specialReserveAmount,
    afterAmount: after.specialReserveAmount,
    reason,
  });

  return { success: true, goals: after };
}

// GAS側のhandleApplyAiTodoActionsと同じく、予算と目標の両方へまとめて反映する
function mockHandleApplyAiTodoActions(body: ApplyTodoActionsParams) {
  const actions = body.actions ?? [];
  if (actions.length === 0) {
    return { success: false, error: "actions is required" };
  }

  for (const action of actions) {
    if (!Number.isFinite(action.amount) || action.amount < 0) {
      return { success: false, error: "amount must be a non-negative number" };
    }

    if (action.type === "budget") {
      if (!action.category) {
        return { success: false, error: "category is required for budget action" };
      }
      const result = mockHandleUpsertBudget({
        category: action.category,
        monthlyBudget: action.amount,
        source: "ai",
        reason: action.reason ?? "",
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
    } else if (action.type === "savingsTarget") {
      const result = mockHandleUpdateGoals({
        savingsTargetMode: "amount",
        savingsTargetAmount: action.amount,
        source: "ai",
        reason: action.reason ?? "",
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
    } else if (action.type === "specialReserve") {
      const result = mockHandleUpdateGoals({
        specialReserveAmount: action.amount,
        source: "ai",
        reason: action.reason ?? "",
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
    } else {
      return { success: false, error: `unknown action type: ${action.type}` };
    }
  }

  return { success: true, applied: actions.length };
}

const MOCK_DECISIONS_STORAGE_KEY = "__mock_decisions__";

// 実際のGASではdecisionsシートに永続化されるため、モックでも
// ページリロードをまたいで再現できるよう sessionStorage に保存する
function loadMockDecisions(): Decision[] {
  const raw = sessionStorage.getItem(MOCK_DECISIONS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Decision[];
    } catch {
      // 壊れたデータは無視してデフォルトにフォールバック
    }
  }
  return [];
}

// GAS側のrecordDecision_と同じく、値が変わっていない場合は記録しない
function recordMockDecision(entry: Omit<Decision, "id" | "changedAt">) {
  if (entry.beforeAmount === entry.afterAmount) {
    return;
  }
  const decisions = loadMockDecisions();
  decisions.push({ ...entry, id: crypto.randomUUID(), changedAt: new Date().toISOString() });
  sessionStorage.setItem(MOCK_DECISIONS_STORAGE_KEY, JSON.stringify(decisions));
}

function mockHandleGetDecisions(body: GetDecisionsParams) {
  const limit = Math.min(Math.max(body?.limit ?? 20, 1), 100);
  return { decisions: loadMockDecisions().reverse().slice(0, limit) };
}

function mockHandleGetVersion() {
  return { version: "v-dev (mock)" };
}

function callMockFunction(functionName: string, args: unknown[]): unknown {
  switch (functionName) {
    case "handleUpload":
      return mockHandleUpload(args[0] as { csv: string; overwriteCategory?: boolean });
    case "handleSummary":
      return mockHandleSummary(args[0] as SummaryParams);
    case "handleTrend":
      return mockHandleTrend(args[0] as TrendParams);
    case "handleMonthlyCalendar":
      return mockHandleMonthlyCalendar(args[0] as MonthlyCalendarParams);
    case "handleStartAiChat":
      return mockHandleStartAiChat(args[0] as StartAiChatParams);
    case "handleContinueAiChat":
      return mockHandleContinueAiChat(args[0] as ContinueAiChatParams);
    case "handleGetAiChatSession":
      return mockHandleGetAiChatSession();
    case "handleSaveAiChatSession":
      return mockHandleSaveAiChatSession(args[0] as SaveAiChatSessionParams);
    case "handleClearAiChatSession":
      return mockHandleClearAiChatSession();
    case "handleRunMigrations":
      return mockHandleRunMigrations();
    case "handleGetSettings":
      return mockHandleGetSettings();
    case "handleUpdateSettings":
      return mockHandleUpdateSettings(args[0] as { prompt?: string; model?: string });
    case "handleGetAiAttributes":
      return mockHandleGetAiAttributes();
    case "handleAddAiAttribute":
      return mockHandleAddAiAttribute(args[0] as AddAiAttributeParams);
    case "handleUpdateAiAttribute":
      return mockHandleUpdateAiAttribute(args[0] as UpdateAiAttributeParams);
    case "handleDeleteAiAttribute":
      return mockHandleDeleteAiAttribute(args[0] as DeleteAiAttributeParams);
    case "handleGetAiMemories":
      return mockHandleGetAiMemories();
    case "handleAddAiMemory":
      return mockHandleAddAiMemory(args[0] as AddAiMemoryParams);
    case "handleDeleteAiMemory":
      return mockHandleDeleteAiMemory(args[0] as DeleteAiMemoryParams);
    case "handleSummarizeAiInsight":
      return mockHandleSummarizeAiInsight(args[0] as SummarizeAiInsightParams);
    case "handleConsolidateAiMemoryInsights":
      return mockHandleConsolidateAiMemoryInsights();
    case "handleGetPreferences":
      return mockHandleGetPreferences();
    case "handleUpdatePreference":
      return mockHandleUpdatePreference(args[0] as UpdatePreferenceParams);
    case "handleTransactionList":
      return mockHandleTransactionList(args[0] as TransactionListParams);
    case "handleUpdateCategory":
      return mockHandleUpdateCategory(args[0] as UpdateCategoryParams);
    case "handleGetAiCategorySuggestions":
      return mockHandleGetAiCategorySuggestions(args[0] as AiCategorySuggestionParams);
    case "handleApplyAiCategorySuggestions":
      return mockHandleApplyAiCategorySuggestions(args[0] as ApplyAiCategorySuggestionsParams);
    case "handleGetCategories":
      return mockHandleGetCategories();
    case "handleUpdateCategoryCostType":
      return mockHandleUpdateCategoryCostType(args[0] as UpdateCategoryCostTypeParams);
    case "handleAddCategory":
      return mockHandleAddCategory(args[0] as AddCategoryParams);
    case "handleRenameCategory":
      return mockHandleRenameCategory(args[0] as RenameCategoryParams);
    case "handleDeleteCategory":
      return mockHandleDeleteCategory(args[0] as DeleteCategoryParams);
    case "handleUpdateCategoryPair":
      return mockHandleUpdateCategoryPair(args[0] as UpdateCategoryPairParams);
    case "handleDeleteCategoryPair":
      return mockHandleDeleteCategoryPair(args[0] as DeleteCategoryPairParams);
    case "handleGetBudgets":
      return mockHandleGetBudgets();
    case "handleGetBudgetVariance":
      return mockHandleGetBudgetVariance(args[0] as GetBudgetVarianceParams);
    case "handleUpsertBudget":
      return mockHandleUpsertBudget(args[0] as UpsertBudgetParams);
    case "handleDeleteBudget":
      return mockHandleDeleteBudget(args[0] as DeleteBudgetParams);
    case "handleApplyAiTodoActions":
      return mockHandleApplyAiTodoActions(args[0] as ApplyTodoActionsParams);
    case "handleGetGoals":
      return mockHandleGetGoals();
    case "handleUpdateGoals":
      return mockHandleUpdateGoals(args[0] as UpdateGoalsParams);
    case "handleGetDecisions":
      return mockHandleGetDecisions(args[0] as GetDecisionsParams);
    case "handleGetVersion":
      return mockHandleGetVersion();
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

// 実際にGeminiを呼ぶハンドラは体感で分かるほど時間がかかる。
// 処理中表示の挙動を再現できるよう、モックでも遅延させる
const MOCK_DELAYS: Record<string, number> = {
  handleSummarizeAiInsight: 150,
  handleApplyAiTodoActions: 150,
};

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
        }, MOCK_DELAYS[prop] ?? 0);
      };
    },
  });
}

export function installGoogleScriptRunMock() {
  const win = window as unknown as { google?: { script?: { run?: ScriptRun } } };
  win.google = { script: { run: createRunProxy() } };
}
