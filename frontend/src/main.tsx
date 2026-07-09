import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

async function main() {
  // import.meta.env.DEV はViteがビルド時に true/false に置換するコンパイル時定数。
  // プロダクションビルドではfalseになりモックコードはバンドルから除外される。
  if (import.meta.env.DEV) {
    const { installGoogleScriptRunMock } = await import("./mocks/googleScriptRun");
    installGoogleScriptRunMock();
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

main();
