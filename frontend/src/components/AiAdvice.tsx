import { useAiAdvice } from "../hooks/useAiAdvice";

interface AiAdviceProps {
  context: string;
}

export function AiAdvice({ context }: AiAdviceProps) {
  const { status, advice, errorMessage, fetchAdvice } = useAiAdvice();

  return (
    <div>
      <button onClick={() => fetchAdvice(context)} disabled={status === "loading"}>
        AIアドバイスを取得
      </button>
      {status === "loading" && <p>読み込み中...</p>}
      {status === "error" && <p role="alert">エラー: {errorMessage}</p>}
      {status === "success" && <p>{advice}</p>}
    </div>
  );
}
