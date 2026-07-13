interface YearSelectorProps {
  year: number;
  onChange: (year: number) => void;
  selectLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  compact?: boolean;
}

const YEAR_RANGE = 5;

function buildOptions(): number[] {
  const now = new Date();
  const options: number[] = [];

  for (let i = 0; i < YEAR_RANGE; i++) {
    options.push(now.getFullYear() - i);
  }

  return options;
}

export function YearSelector({
  year,
  onChange,
  selectLabel = "対象年",
  prevLabel = "前の年",
  nextLabel = "次の年",
  compact = false,
}: YearSelectorProps) {
  const options = buildOptions();
  const allOptions = options.includes(year) ? options : [year, ...options];

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mb-4"}`}>
      <button
        type="button"
        onClick={() => onChange(year - 1)}
        aria-label={prevLabel}
        className={`btn btn-square ${compact ? "btn-xs" : "btn-sm"}`}
      >
        ‹
      </button>
      <select
        aria-label={selectLabel}
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`select select-bordered ${compact ? "select-sm w-auto" : "w-full max-w-xs"}`}
      >
        {allOptions.map((option) => (
          <option key={option} value={option}>
            {option}年
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        aria-label={nextLabel}
        className={`btn btn-square ${compact ? "btn-xs" : "btn-sm"}`}
      >
        ›
      </button>
    </div>
  );
}
