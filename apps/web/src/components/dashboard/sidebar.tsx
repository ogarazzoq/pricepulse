'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BellRing,
  LayoutDashboard,
  LineChart,
  Package,
  Settings,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/features/auth/auth.store';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/alerts', label: 'Alerts', icon: BellRing },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/marketplaces', label: 'Marketplaces', icon: Store },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminItems = [{ href: '/admin', label: 'Admin', icon: ShieldCheck }];

export function DashboardSidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 border-r border-border/40 bg-background/60 backdrop-blur-xl lg:block">
      <div className="flex h-16 items-center px-6 border-b border-border/40">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {role === 'ADMIN' && (
          <>
            <p className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </p>
            {adminItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="absolute bottom-4 inset-x-3">
        <div className="rounded-lg border border-border/60 bg-card/40 p-3">
          <p className="text-xs font-medium">Tip</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Pin frequently checked products to your dashboard for one-click pricing snapshots.
          </p>
        </div>
      </div>
    </aside>
  );
}
