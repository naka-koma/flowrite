import { useEffect, useState } from "react";

export type Theme = "fluorite" | "fluorite-dark";

const STORAGE_KEY = "flowrite-theme";

function readStoredTheme(): Theme {
  return localStorage.getItem(STORAGE_KEY) === "fluorite-dark" ? "fluorite-dark" : "fluorite";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
