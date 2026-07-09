import { http, HttpResponse } from "msw";
import type {
  UploadResponse,
  SummaryResponse,
  TrendResponse,
  AiAdviceResponse,
} from "../types/api";

export const handlers = [
  http.get("/", ({ request }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "summary") {
      const year = Number(url.searchParams.get("year")) || 2024;
      const month = Number(url.searchParams.get("month")) || 1;

      // MonthSelectorが選択肢に出す最古の月（MONTH_RANGE=24ヶ月前）をデータなしケースとして扱う
      const now = new Date();
      const oldest = new Date(now.getFullYear(), now.getMonth() - 23, 1);
      const isOldestMonth = year === oldest.getFullYear() && month === oldest.getMonth() + 1;

      if (isOldestMonth) {
        const response: SummaryResponse = {
          year,
          month,
          totalExpense: 0,
          totalIncome: 0,
          categories: [],
        };
        return HttpResponse.json(response);
      }

      const response: SummaryResponse = {
        year,
        month,
        totalExpense: 150000,
        totalIncome: 300000,
        categories: [
          { name: "食費", total: 40000 },
          { name: "交通費", total: 20000 },
          { name: "娯楽", total: 15000 },
          { name: "光熱費", total: 12000 },
          { name: "その他", total: 63000 },
        ],
      };
      return HttpResponse.json(response);
    }

    if (action === "trend") {
      // E2Eテスト専用: テストがヘッダーを付与した場合のみデータなしレスポンスを返す
      if (request.headers.get("x-test-scenario") === "empty") {
        const response: TrendResponse = { months: [] };
        return HttpResponse.json(response);
      }

      const response: TrendResponse = {
        months: [
          { year: 2024, month: 1, totalExpense: 150000, totalIncome: 300000 },
          { year: 2024, month: 2, totalExpense: 130000, totalIncome: 300000 },
          { year: 2024, month: 3, totalExpense: 160000, totalIncome: 300000 },
          { year: 2024, month: 4, totalExpense: 145000, totalIncome: 300000 },
          { year: 2024, month: 5, totalExpense: 170000, totalIncome: 300000 },
        ],
      };
      return HttpResponse.json(response);
    }
  }),

  http.post("/", async ({ request }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "upload") {
      const body = (await request.json()) as { csv: string };
      const csvText = atob(body.csv);

      if (csvText.includes("INVALID")) {
        const response: UploadResponse = {
          success: false,
          inserted: 0,
          skipped: 0,
          error: "CSVの形式が正しくありません",
        };
        return HttpResponse.json(response);
      }

      const response: UploadResponse = {
        success: true,
        inserted: 12,
        skipped: 3,
      };
      return HttpResponse.json(response);
    }

    if (action === "ai_advice") {
      const response: AiAdviceResponse = {
        success: true,
        advice:
          "今月の支出は先月より10%増加しています。特に食費が増加傾向にあります。外食を減らし、自炊を心がけることで月2万円程度の節約が見込めます。",
      };
      return HttpResponse.json(response);
    }
  }),
];
