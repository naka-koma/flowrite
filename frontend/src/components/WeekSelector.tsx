import { dateToWeekInputValue, formatISODate, parseISODate, weekInputValueToMonday } from "../lib/week";

interface WeekSelectorProps {
  weekStart: string;
  onChange: (weekStart: string) => void;
}

function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const date = parseISODate(weekStart);
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() + deltaWeeks * 7);
  return formatISODate(shifted);
}

export function WeekSelector({ weekStart, onChange }: WeekSelectorProps) {
  const inputValue = dateToWeekInputValue(parseISODate(weekStart));

  const handleChange = (value: string) => {
    const monday = weekInputValueToMonday(value);
    if (!monday) return;
    onChange(formatISODate(monday));
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftWeek(weekStart, -1))}
        aria-label="前の週"
        className="btn btn-square btn-sm"
      >
        ‹
      </button>
      <input
        type="week"
        aria-label="対象週"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        className="input input-bordered w-full max-w-xs"
      />
      <button
        type="button"
        onClick={() => onChange(shiftWeek(weekStart, 1))}
        aria-label="次の週"
        className="btn btn-square btn-sm"
      >
        ›
      </button>
    </div>
  );
}
