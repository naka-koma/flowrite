import { useMigrations } from "../hooks/useMigrations";

export function AdminSection() {
  const { status, data, errorMessage, runMigrations } = useMigrations();

  const handleClick = () => {
    if (!window.confirm("未適用のマイグレーションを実行します。よろしいですか？")) {
      return;
    }
    runMigrations();
  };

  return (
    <div>
      <button onClick={handleClick} disabled={status === "loading"} className="btn btn-warning">
        {status === "loading" && <span className="loading loading-spinner loading-sm" />}
        マイグレーション実行
      </button>
      {status === "loading" && <p className="mt-2 text-sm text-base-content/70">実行中...</p>}
      {status === "error" && (
        <p role="alert" className="alert alert-error mt-3">
          エラー: {errorMessage}
        </p>
      )}
      {status === "success" && data && (
        <div className="mt-3">
          {data.results.length === 0 ? (
            <p className="text-base-content/70">適用対象のマイグレーションはありませんでした</p>
          ) : (
            <ul className="text-sm">
              {data.results.map((r) => (
                <li key={r.id}>
                  {r.success ? "✓" : "✗"} {r.id}: {r.description}
                  {!r.success && r.error ? `（エラー: ${r.error}）` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
