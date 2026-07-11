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

  return (
    <select
      aria-label="対象年"
      value={year}
      onChange={(e) => onChange(Number(e.target.value))}
      className="select select-bordered mb-4 w-full max-w-xs"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}年
        </option>
      ))}
    </select>
  );
}
