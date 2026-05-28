import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-10 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_50%,#064e3b_100%)]" />
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute -inset-1 bg-gradient-brand mix-blend-overlay" />

        <div className="relative">
          <Link href="/">
            <Logo className="text-white" />
          </Link>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Track every price, across every marketplace, in one elegant dashboard.
          </h2>
          <p className="text-white/70">
            PricePulse aggregates real-time price signals, learns historical trends, and pings you
            the moment a deal hits your threshold.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#22c55e', '#6366f1', '#a855f7'].map((c) => (
                <div
                  key={c}
                  className="h-8 w-8 rounded-full border-2 border-white/30"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span className="text-sm text-white/70">12,000+ products tracked daily</span>
          </div>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} PricePulse, Inc.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
