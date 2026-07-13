import { useEffect, useState } from "react";
import type { MonthlyCalendarParams, MonthlyCalendarResponse } from "../types/api";
import { runScript } from "../lib/googleScriptRun";

type MonthlyCalendarStatus = "loading" | "success" | "error";

interface MonthlyCalendarState {
  status: MonthlyCalendarStatus;
  data: MonthlyCalendarResponse | null;
  errorMessage: string | null;
}

export function useMonthlyCalendar(params: MonthlyCalendarParams) {
  const [state, setState] = useState<MonthlyCalendarState>({
    status: "loading",
    data: null,
    errorMessage: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, errorMessage: null });

    runScript<MonthlyCalendarResponse>("handleMonthlyCalendar", params)
      .then((data) => {
        if (cancelled) return;

        if (data.error) {
          setState({ status: "error", data: null, errorMessage: data.error });
          return;
        }

        setState({ status: "success", data, errorMessage: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "カレンダーの取得に失敗しました";
        setState({ status: "error", data: null, errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [params.year, params.month]);

  return state;
}
