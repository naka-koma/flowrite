import { useAiAdvice } from "../hooks/useAiAdvice";
import { maskYenAmounts } from "../lib/money";

interface AiAdviceProps {
  context: string;
  hideAmounts: boolean;
}

export function AiAdvice({ context, hideAmounts }: AiAdviceProps) {
  const { status, advice, errorMessage, fetchAdvice } = useAiAdvice();

  return (
    <div>
      <button
        onClick={() => fetchAdvice(context)}
        disabled={status === "loading"}
        className="btn btn-primary"
      >
        {status === "loading" && <span className="loading loading-spinner loading-sm" />}
        AIアドバイスを取得
      </button>
      {status === "loading" && <p className="mt-2 text-sm text-base-content/70">読み込み中...</p>}
      {status === "error" && (
        <p role="alert" className="alert alert-error mt-3">
          エラー: {errorMessage}
        </p>
      )}
      {status === "success" && (
        <p className="mt-3 whitespace-pre-wrap">{hideAmounts ? maskYenAmounts(advice ?? "") : advice}</p>
      )}
    </div>
  );
}
