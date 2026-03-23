import axios, { AxiosError } from "axios";

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Произошла ошибка при обращении к серверу.",
): string => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const err = error as AxiosError<{ detail?: string | string[] }>;
  const detail = err.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.join("; ");
  }
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (err.message) {
    return err.message;
  }
  return fallback;
};

