interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
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

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const options = buildOptions();

  const handleChange = (value: string) => {
    const parts = value.split("-");
    onChange(Number(parts[0]), Number(parts[1]));
  };

  return (
    <select
      aria-label="対象年月"
      value={`${year}-${month}`}
      onChange={(e) => handleChange(e.target.value)}
      className="select select-bordered mb-4 w-full max-w-xs"
    >
      {options.map((option) => (
        <option key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
          {option.year}年{option.month}月
        </option>
      ))}
    </select>
  );
}
