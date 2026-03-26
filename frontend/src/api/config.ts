const FALLBACK_API_BASE_URL = "http://localhost:8000/api/v1";

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, "");

const ensureApiV1 = (baseUrl: string): string => {
  // If user provided already versioned API path, keep it.
  if (/\/api\/v\d+$/i.test(baseUrl)) return baseUrl;
  // If user provided base host (or /api), append /api/v1.
  if (/\/api$/i.test(baseUrl)) return `${baseUrl}/v1`;
  return `${baseUrl}/api/v1`;
};

export const getApiBaseUrl = (): string => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string") {
    return FALLBACK_API_BASE_URL;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return FALLBACK_API_BASE_URL;
  }
  return ensureApiV1(normalizeBaseUrl(trimmed));
};

export const API_BASE_URL = getApiBaseUrl();

