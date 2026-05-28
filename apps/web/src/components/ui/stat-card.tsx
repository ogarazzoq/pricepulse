import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: number; label?: string };
  icon?: ReactNode;
  accent?: 'brand' | 'success' | 'warning' | 'danger';
}

const accents: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand: 'from-primary/40 to-fuchsia-500/30',
  success: 'from-emerald-500/40 to-emerald-500/10',
  warning: 'from-amber-500/40 to-amber-500/10',
  danger: 'from-rose-500/40 to-rose-500/10',
};

export function StatCard({ label, value, delta, icon, accent = 'brand' }: StatCardProps) {
  const positive = (delta?.value ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 -top-12 h-32 bg-gradient-to-b blur-3xl opacity-70',
          accents[accent],
        )}
      />
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {icon && <div className="text-muted-foreground/80">{icon}</div>}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        {delta && (
          <div
            className={cn(
              'mt-1 inline-flex items-center gap-1 text-xs font-medium',
              positive ? 'text-emerald-500' : 'text-rose-500',
            )}
          >
            <span>
              {positive ? '▲' : '▼'} {Math.abs(delta.value).toFixed(1)}%
            </span>
            {delta.label && <span className="text-muted-foreground">{delta.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
