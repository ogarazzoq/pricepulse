'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/auth.store';
import { NAV_SECTIONS, isPathActive } from './nav-config';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);

  // Close drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden ring-focus"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 lg:hidden" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-xs flex-col border-r border-border bg-background shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left lg:hidden"
          aria-label="Navigation"
        >
          <div className="flex h-16 items-center justify-between border-b border-border/40 px-4">
            <Dialog.Title asChild>
              <Logo />
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground ring-focus"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
            {NAV_SECTIONS.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !item.adminOnly || role === 'ADMIN',
              );
              if (visibleItems.length === 0) return null;
              return (
                <div key={section.label} className="mb-4">
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
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ring-focus',
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
