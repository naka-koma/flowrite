interface YearSelectorProps {
  year: number;
  onChange: (year: number) => void;
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

export function YearSelector({ year, onChange }: YearSelectorProps) {
  const options = buildOptions();
  const allOptions = options.includes(year) ? options : [year, ...options];

  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(year - 1)}
        aria-label="前の年"
        className="btn btn-square btn-sm"
      >
        ‹
      </button>
      <select
        aria-label="対象年"
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        className="select select-bordered w-full max-w-xs"
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
        aria-label="次の年"
        className="btn btn-square btn-sm"
      >
        ›
      </button>
    </div>
  );
}
