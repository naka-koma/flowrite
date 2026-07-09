interface ScriptRun {
  withSuccessHandler(cb: (result: unknown) => void): ScriptRun;
  withFailureHandler(cb: (error: Error) => void): ScriptRun;
  [functionName: string]: unknown;
}

function getScriptRun(): ScriptRun | null {
  const google = (window as unknown as { google?: { script?: { run?: ScriptRun } } }).google;
  return google?.script?.run ?? null;
}

export function runScript<T>(functionName: string, ...args: unknown[]): Promise<T> {
  const run = getScriptRun();
  if (!run) {
    return Promise.reject(new Error("google.script.run is not available"));
  }

  return new Promise<T>((resolve, reject) => {
    const bound = run
      .withSuccessHandler((result) => resolve(result as T))
      .withFailureHandler((error) => reject(error));
    const fn = bound[functionName];

    if (typeof fn !== "function") {
      reject(new Error(`google.script.run.${functionName} is not a function`));
      return;
    }

    (fn as (...a: unknown[]) => void).apply(bound, args);
  });
}
