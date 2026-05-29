'use client';

import { Search, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuthStore } from '@/features/auth/auth.store';
import { useLogout } from '@/features/auth/use-auth';
import { MobileNav } from './mobile-nav';

export function DashboardHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [q, setQ] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    if (value.length < 2) return;
    router.push(`/products?q=${encodeURIComponent(value)}`);
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-2 border-b border-border/40 bg-background/85 px-3 backdrop-blur-xl sm:gap-3 sm:px-6 lg:px-8"
      aria-label="Application header"
    >
      <MobileNav />

      <form
        onSubmit={onSubmit}
        className="flex flex-1 max-w-xl"
        role="search"
        aria-label="Search products across marketplaces"
      >
        <label htmlFor="header-search" className="sr-only">
          Search products
        </label>
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="header-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="pl-9 h-10"
          />
        </div>
      </form>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <div className="hidden items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 sm:flex">
          <div
            className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-[11px] font-semibold flex items-center justify-center text-white"
            aria-hidden="true"
          >
            {user?.name?.[0]?.toUpperCase() ?? '·'}
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-xs font-semibold">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
