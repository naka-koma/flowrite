function getBaseUrl(): string {
  const value = (window as unknown as { __FLOWRITE_BASE_URL__?: unknown }).__FLOWRITE_BASE_URL__;
  return typeof value === "string" ? value : "";
}

export function apiUrl(query: string): string {
  return `${getBaseUrl()}${query}`;
}
