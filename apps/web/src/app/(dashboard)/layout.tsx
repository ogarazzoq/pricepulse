'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/auth.store';
import { authApi } from '@/features/auth/auth.api';
import { tokenStorage } from '@/lib/api-client';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, hydrated, setUser, clear } = useAuthStore();

  // Run me-fetch only after hydration AND only if a token exists.
  const me = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: hydrated && !!tokenStorage.getAccess(),
    staleTime: 60_000,
    retry: false,
  });

  // Redirect logic isolated to a single effect to avoid flash.
  useEffect(() => {
    if (!hydrated) return;
    const token = tokenStorage.getAccess();
    if (!token) {
      router.replace('/login');
      return;
    }
    if (me.isError) {
      tokenStorage.clear();
      clear();
      router.replace('/login');
    }
  }, [hydrated, me.isError, router, clear]);

  // Hydrate the auth store from the verified profile.
  useEffect(() => {
    if (me.data) setUser(me.data);
  }, [me.data, setUser]);

  if (!hydrated || (!user && !me.data)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
