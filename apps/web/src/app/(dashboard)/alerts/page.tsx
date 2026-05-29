'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Pause, Play, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { alertsApi, type Alert } from '@/features/alerts/alerts.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AlertsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['alerts'], queryFn: alertsApi.list });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'PAUSED' }) =>
      alertsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => alertsApi.archive(id),
    onSuccess: () => {
      toast.success('Alert archived');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const conditionLabel = (a: Alert) => {
    if (a.condition === 'BELOW') return `≤ ${formatCurrency(a.threshold)}`;
    if (a.condition === 'ABOVE') return `≥ ${formatCurrency(a.threshold)}`;
    return `−${a.threshold}%`;
  };

  const onToggle = (a: Alert) =>
    update.mutate({ id: a.id, status: a.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Get notified the moment a tracked product crosses your threshold.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your active alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !data?.length ? (
            <EmptyState
              icon={<BellRing className="h-5 w-5" />}
              title="No alerts yet"
              description="Open any product page and tap ‘Create alert’ to start watching its price."
            />
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="space-y-3 md:hidden">
                {data.map((a) => (
                  <li key={a.id}>
                    <Card className="overflow-hidden">
                      <Link
                        href={`/products/${a.productId}`}
                        className="ring-focus flex items-center gap-3 p-4"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {a.productImageUrl && (
                            <Image
                              src={a.productImageUrl}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-contain p-1"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">{a.productTitle}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {conditionLabel(a)}
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </Link>
                      <div className="flex items-center justify-between gap-2 border-t border-border/40 px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {a.channels.map((c) => (
                            <Badge key={c} variant="secondary" className="text-[10px]">
                              {c}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggle(a)}
                            aria-label={a.status === 'ACTIVE' ? 'Pause alert' : 'Resume alert'}
                          >
                            {a.status === 'ACTIVE' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => archive.mutate(a.id)}
                            aria-label="Archive alert"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            href={`/products/${a.productId}`}
                            className="ring-focus flex items-center gap-3 rounded-md"
                          >
                            <div className="relative h-9 w-9 overflow-hidden rounded-md bg-muted">
                              {a.productImageUrl && (
                                <Image
                                  src={a.productImageUrl}
                                  alt=""
                                  fill
                                  sizes="36px"
                                  className="object-contain p-1"
                                />
                              )}
                            </div>
                            <span className="line-clamp-1 max-w-[260px] text-sm font-medium">
                              {a.productTitle}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">
                          {conditionLabel(a)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {a.channels.map((c) => (
                              <Badge key={c} variant="secondary" className="text-[10px]">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(a.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={
                                a.status === 'ACTIVE' ? 'Pause alert' : 'Resume alert'
                              }
                              onClick={() => onToggle(a)}
                            >
                              {a.status === 'ACTIVE' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Archive alert"
                              onClick={() => archive.mutate(a.id)}
                            >
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: Alert['status'] }) {
  const variant =
    status === 'ACTIVE'
      ? 'success'
      : status === 'PAUSED'
      ? 'warning'
      : status === 'TRIGGERED'
      ? 'default'
      : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
}
