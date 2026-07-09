import { useState } from "react";
import { UploadForm } from "./components/UploadForm";
import { MonthSelector } from "./components/MonthSelector";
import { SummaryTable } from "./components/SummaryTable";
import { useSummary } from "./hooks/useSummary";

export function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { status, data, errorMessage } = useSummary(year, month);

  return (
    <div>
      <h1>flowrite</h1>
      <p>家計管理ダッシュボード</p>
      <UploadForm />
      <MonthSelector
        year={year}
        month={month}
        onChange={(newYear, newMonth) => {
          setYear(newYear);
          setMonth(newMonth);
        }}
      />
      <SummaryTable data={data} errorMessage={errorMessage} isLoading={status === "loading"} />
    </div>
  );
}
