import { api } from '@/lib/api-client';
import type { AuthSession, User } from './auth.types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthSession>('/auth/login', { email, password }).then((r) => r.data),

  register: (email: string, name: string, password: string) =>
    api.post<AuthSession>('/auth/register', { email, name, password }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<AuthSession>('/auth/refresh', { refreshToken }).then((r) => r.data),

  me: () => api.get<User>('/users/me').then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),
};
