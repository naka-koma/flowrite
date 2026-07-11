import { useEffect, useState } from "react";

const STORAGE_KEY = "flowrite-hide-amounts";

function readStoredHidden(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function useAmountVisibility() {
  const [hideAmounts, setHideAmounts] = useState<boolean>(readStoredHidden);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(hideAmounts));
  }, [hideAmounts]);

  return { hideAmounts, toggleHideAmounts: () => setHideAmounts((h) => !h) };
}
