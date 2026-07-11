import { dateToWeekInputValue, formatISODate, parseISODate, weekInputValueToMonday } from "../lib/week";

interface WeekSelectorProps {
  weekStart: string;
  onChange: (weekStart: string) => void;
}

export function WeekSelector({ weekStart, onChange }: WeekSelectorProps) {
  const inputValue = dateToWeekInputValue(parseISODate(weekStart));

  const handleChange = (value: string) => {
    const monday = weekInputValueToMonday(value);
    if (!monday) return;
    onChange(formatISODate(monday));
  };

  return (
    <input
      type="week"
      aria-label="対象週"
      value={inputValue}
      onChange={(e) => handleChange(e.target.value)}
      className="input input-bordered mb-4 w-full max-w-xs"
    />
  );
}
