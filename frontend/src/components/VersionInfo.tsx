import { useVersion } from "../hooks/useVersion";

export function VersionInfo() {
  const { status, version, errorMessage } = useVersion();

  if (status === "loading") {
    return (
      <p className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm" />
        読み込み中...
      </p>
    );
  }

  if (status === "error") {
    return (
      <p role="alert" className="alert alert-error">
        エラー: {errorMessage}
      </p>
    );
  }

  return <p className="text-base-content/70">{version}</p>;
}
