interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  selectLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
}

const MONTH_RANGE = 24;

function buildOptions(): { year: number; month: number }[] {
  const now = new Date();
  const options: { year: number; month: number }[] = [];

  for (let i = 0; i < MONTH_RANGE; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }

  return options;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function MonthSelector({
  year,
  month,
  onChange,
  selectLabel = "対象年月",
  prevLabel = "前の月",
  nextLabel = "次の月",
}: MonthSelectorProps) {
  const options = buildOptions();
  const hasCurrent = options.some((o) => o.year === year && o.month === month);
  const allOptions = hasCurrent ? options : [{ year, month }, ...options];

  const handleChange = (value: string) => {
    const parts = value.split("-");
    onChange(Number(parts[0]), Number(parts[1]));
  };

  const goToOffset = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    onChange(next.year, next.month);
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        type="button"
        onClick={() => goToOffset(-1)}
        aria-label={prevLabel}
        className="btn btn-square btn-sm"
      >
        ‹
      </button>
      <select
        aria-label={selectLabel}
        value={`${year}-${month}`}
        onChange={(e) => handleChange(e.target.value)}
        className="select select-bordered w-full max-w-xs"
      >
        {allOptions.map((option) => (
          <option key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
            {option.year}年{option.month}月
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => goToOffset(1)}
        aria-label={nextLabel}
        className="btn btn-square btn-sm"
      >
        ›
      </button>
    </div>
  );
}
