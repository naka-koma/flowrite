import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient();

async function main() {
  // import.meta.env.DEV はViteがビルド時に true/false に置換するコンパイル時定数。
  // プロダクションビルドではfalseになりモックコードはバンドルから除外される。
  if (import.meta.env.DEV) {
    const { installGoogleScriptRunMock } = await import("./mocks/googleScriptRun");
    installGoogleScriptRunMock();
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

main();
