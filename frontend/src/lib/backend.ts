const BACKEND_API_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "";

export function backendUrl(path: string) {
  return `${BACKEND_API_URL}${path}`;
}

export function backendHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  const apiKey = process.env.BACKEND_API_KEY;

  if (apiKey) {
    headers.set("x-sple-internal-key", apiKey);
  }

  return headers;
}
