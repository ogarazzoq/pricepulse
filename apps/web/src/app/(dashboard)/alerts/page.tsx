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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AlertsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['alerts'], queryFn: alertsApi.list });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'PAUSED' }) =>
      alertsApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
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
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !data?.length ? (
            <EmptyState
              icon={<BellRing className="h-5 w-5" />}
              title="No alerts yet"
              description="Open any product page and click ‘Create alert’ to start watching its price."
            />
          ) : (
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
                      <Link href={`/products/${a.productId}`} className="flex items-center gap-3">
                        <div className="relative h-9 w-9 overflow-hidden rounded-md bg-muted">
                          {a.productImageUrl && (
                            <Image
                              src={a.productImageUrl}
                              alt={a.productTitle}
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
                    <TableCell className="font-mono text-sm">{conditionLabel(a)}</TableCell>
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
                      <Badge
                        variant={
                          a.status === 'ACTIVE'
                            ? 'success'
                            : a.status === 'PAUSED'
                            ? 'warning'
                            : a.status === 'TRIGGERED'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      {a.status === 'ACTIVE' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Pause"
                          onClick={() => update.mutate({ id: a.id, status: 'PAUSED' })}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Resume"
                          onClick={() => update.mutate({ id: a.id, status: 'ACTIVE' })}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Archive"
                        onClick={() => archive.mutate(a.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
