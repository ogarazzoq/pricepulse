'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, Globe, XCircle, TrendingUp, Package, DollarSign, Activity, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { marketplacesApi } from '@/features/marketplaces/marketplaces.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function MarketplacesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketplaces'],
    queryFn: marketplacesApi.list,
  });

  const activeCount = data?.filter((m) => m.isActive).length || 0;
  const totalCount = data?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Marketplaces
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-sm text-muted-foreground"
        >
          Connected marketplace providers — built on a pluggable abstraction layer.
        </motion.p>
      </div>

      {/* Stats Overview */}
      {!isLoading && data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4"
        >
          <StatsCard
            title="Total Marketplaces"
            value={totalCount}
            icon={<Globe className="h-4 w-4" />}
            trend={null}
          />
          <StatsCard
            title="Active"
            value={activeCount}
            icon={<CheckCircle2 className="h-4 w-4" />}
            trend={`${totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}%`}
            trendColor="text-success"
          />
          <StatsCard
            title="Disabled"
            value={totalCount - activeCount}
            icon={<XCircle className="h-4 w-4" />}
            trend={null}
          />
          <StatsCard
            title="Provider Types"
            value={new Set(data.map((m) => m.slug.split('-')[0])).size}
            icon={<Package className="h-4 w-4" />}
            trend={null}
          />
        </motion.div>
      )}

      {/* Marketplace Grid */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Skeleton className="h-56" />
              </motion.div>
            ))
          : data?.map((m, index) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <MarketplaceCard marketplace={m} />
              </motion.div>
            ))}
      </div>
    </motion.div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  trend,
  trendColor = 'text-muted-foreground',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: string | null;
  trendColor?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {trend && <span className={cn('text-xs font-medium', trendColor)}>{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function MarketplaceCard({
  marketplace: m,
}: {
  marketplace: {
    id: string;
    name: string;
    slug: string;
    baseCurrency: string;
    isActive: boolean;
    websiteUrl?: string | null;
    providerAvailable: boolean;
  };
}) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:shadow-lg hover:border-primary/40',
        m.isActive ? 'border-l-4 border-l-success' : 'border-l-4 border-l-muted',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Icon */}
          <motion.div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              m.isActive ? 'bg-success/10' : 'bg-muted/50',
            )}
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <Globe
              className={cn(
                'h-6 w-6',
                m.isActive ? 'text-success' : 'text-muted-foreground',
              )}
            />
          </motion.div>

          {/* Status Badge */}
          {m.isActive ? (
            <Badge variant="success" className="gap-1">
              <Activity className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>

        <div className="mt-3">
          <CardTitle className="text-base font-semibold">{m.name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{m.slug}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Currency</p>
            </div>
            <p className="text-sm font-semibold">{m.baseCurrency}</p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider</p>
            </div>
            <p className="text-sm font-semibold">
              {m.providerAvailable ? (
                <span className="text-success">Available</span>
              ) : (
                <span className="text-muted-foreground">Not registered</span>
              )}
            </p>
          </div>
        </div>

        {/* Website Link */}
        {m.websiteUrl && (
          <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
            <Link
              href={m.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline group/link"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="line-clamp-1">Visit marketplace</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </Link>
          </motion.div>
        )}

        {/* Health Indicator */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    m.isActive && m.providerAvailable
                      ? 'bg-success'
                      : m.isActive
                      ? 'bg-warning'
                      : 'bg-muted',
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs font-medium tabular-nums">
              {m.isActive && m.providerAvailable
                ? '100%'
                : m.isActive
                ? '66%'
                : '0%'}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
}

