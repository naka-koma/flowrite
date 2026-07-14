interface PageHeaderProps {
  title: string;
  onBack: () => void;
}

export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onBack} aria-label="ダッシュボードに戻る" className="btn btn-ghost btn-sm">
        ‹ 戻る
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  );
}
