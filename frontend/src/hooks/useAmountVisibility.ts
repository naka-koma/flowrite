import { useState } from "react";

// スクリーンショット共有時に一時的に使うだけなので、リロードで表示に戻ってよい（永続化しない）
export function useAmountVisibility() {
  const [hideAmounts, setHideAmounts] = useState(false);

  return { hideAmounts, toggleHideAmounts: () => setHideAmounts((h) => !h) };
}
