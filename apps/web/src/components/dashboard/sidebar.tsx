'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/features/auth/auth.store';
import { NAV_SECTIONS, isPathActive } from './nav-config';

export function DashboardSidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);

  return (
    <aside
      className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/40 bg-background/60 backdrop-blur-xl lg:flex lg:flex-col"
      aria-label="Primary navigation"
    >
      <div className="flex h-16 items-center px-6 border-b border-border/40">
        <Link href="/dashboard" className="ring-focus rounded-md">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.adminOnly || role === 'ADMIN',
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label} className="mb-6 last:mb-0">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isPathActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ring-focus',
                          active
                            ? section.label === 'Administration'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="m-3">
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
