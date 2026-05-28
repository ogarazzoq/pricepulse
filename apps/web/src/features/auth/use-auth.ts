'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from './auth.api';
import { useAuthStore } from './auth.store';
import { tokenStorage } from '@/lib/api-client';
import { toast } from 'sonner';

export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (session) => {
      tokenStorage.set(session.accessToken, session.refreshToken);
      setUser(session.user);
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}`);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Login failed');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: ({ email, name, password }: { email: string; name: string; password: string }) =>
      authApi.register(email, name, password),
    onSuccess: (session) => {
      tokenStorage.set(session.accessToken, session.refreshToken);
      setUser(session.user);
      toast.success(`Welcome to PricePulse, ${session.user.name.split(' ')[0]}!`);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Registration failed');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);
  return () => {
    const refreshToken = tokenStorage.getRefresh();
    if (refreshToken) authApi.logout(refreshToken).catch(() => null);
    tokenStorage.clear();
    clear();
    router.push('/login');
  };
}
