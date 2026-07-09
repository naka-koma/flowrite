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
      const response: SummaryResponse = {
        year: Number(url.searchParams.get("year")) || 2024,
        month: Number(url.searchParams.get("month")) || 1,
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
