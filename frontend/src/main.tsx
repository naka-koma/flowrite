import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";

async function main() {
  // import.meta.env.DEV はViteがビルド時に true/false に置換するコンパイル時定数。
  // プロダクションビルドではfalseになりモックコードはバンドルから除外される。
  if (import.meta.env.DEV) {
    const { installGoogleScriptRunMock } = await import("./mocks/googleScriptRun");
    installGoogleScriptRunMock();
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {/* GAS WebAppはgoogleusercontent.comのサンドボックスiframe内で描画されるため、
          history.pushStateに依存するBrowserRouterは動作が不確実（Issue #186）。
          location.hashベースのHashRouterを使うことでiframe内でも安全に履歴を積める */}
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  );
}

main();
