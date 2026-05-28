'use client';

import { Search, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuthStore } from '@/features/auth/auth.store';
import { useLogout } from '@/features/auth/use-auth';

export function DashboardHeader() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [q, setQ] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    router.push(`/products?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl sm:px-8">
      <form onSubmit={onSubmit} className="flex flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products across marketplaces…"
            className="pl-9"
          />
        </div>
      </form>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-[11px] font-semibold flex items-center justify-center text-white">
            {user?.name?.[0]?.toUpperCase() ?? '·'}
          </div>
          <div className="hidden sm:block leading-tight">
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
