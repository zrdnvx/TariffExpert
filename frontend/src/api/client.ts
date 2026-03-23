import axios, { AxiosError } from "axios";
import { useAuth } from "../state/AuthContext";
import { useMemo } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export const useApiClient = () => {
  const { tokens, setTokens } = useAuth();

  const client = useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE_URL,
    });

    type PendingRequest = {
      resolve: (token: string) => void;
      reject: (error: unknown) => void;
    };

    instance.interceptors.request.use((config) => {
      if (tokens?.accessToken) {
        config.headers["Authorization"] = `Bearer ${tokens.accessToken}`;
      }
      return config;
    });

    let isRefreshing = false;
    let pendingRequests: PendingRequest[] = [];

    const processQueueSuccess = (token: string) => {
      pendingRequests.forEach((request) => request.resolve(token));
      pendingRequests = [];
    };
    const processQueueError = (error: unknown) => {
      pendingRequests.forEach((request) => request.reject(error));
      pendingRequests = [];
    };

    instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        if (!originalRequest) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && tokens?.refreshToken && !originalRequest._retry) {
          originalRequest._retry = true;

          if (isRefreshing) {
            const token = await new Promise<string>((resolve, reject) =>
              pendingRequests.push({ resolve, reject }),
            );
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return instance(originalRequest);
          }

          isRefreshing = true;
          try {
            const res = await axios.post<RefreshResponse>(
              `${API_BASE_URL}/auth/refresh`,
              { refresh_token: tokens.refreshToken },
            );
            const nextTokens = {
              accessToken: res.data.access_token,
              refreshToken: res.data.refresh_token,
            };
            setTokens(nextTokens);
            processQueueSuccess(nextTokens.accessToken);

            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers["Authorization"] = `Bearer ${nextTokens.accessToken}`;
            return instance(originalRequest);
          } catch (refreshErr) {
            processQueueError(refreshErr);
            setTokens(null);
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }

        return Promise.reject(error);
      },
    );

    return instance;
  }, [tokens, setTokens]);

  return client;
};

