import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * Resolves the API base URL.
 *
 * Order of precedence:
 *   1. NEXT_PUBLIC_API_URL  (set in Vercel project settings)
 *   2. http://localhost:4000/api/v1 (dev fallback)
 *
 * Trailing slashes are stripped to avoid double slashes in requests.
 */
function resolveBaseURL(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  const url = fromEnv || 'http://localhost:4000/api/v1';
  return url.replace(/\/+$/, '');
}

const API_URL = resolveBaseURL();

const ACCESS_KEY = 'pp_access';
const REFRESH_KEY = 'pp_refresh';

export const tokenStorage = {
  getAccess: () =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_KEY),
  getRefresh: () =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_KEY, access);
    window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  timeout: 20_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    tokenStorage.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original) return Promise.reject(error);

    // Don't try to refresh on the refresh endpoint itself.
    const isRefreshCall = original.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isRefreshCall) {
      original._retry = true;
      refreshing ??= refresh().finally(() => (refreshing = null));
      const newToken = await refreshing;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export { API_URL };
