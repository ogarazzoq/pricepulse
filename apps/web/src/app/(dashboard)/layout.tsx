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

  const me = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: hydrated && !!tokenStorage.getAccess(),
    staleTime: 60_000,
    retry: false,
  });

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

  useEffect(() => {
    if (me.data) setUser(me.data);
  }, [me.data, setUser]);

  if (!hydrated || (!user && !me.data)) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="sr-only">Loading your workspace…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <DashboardSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
