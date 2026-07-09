import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

async function main() {
  // import.meta.env.DEV はViteがビルド時に true/false に置換するコンパイル時定数。
  // プロダクションビルドでは false になりMSWコードはバンドルから除外される。
  if (import.meta.env.DEV) {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

main();
