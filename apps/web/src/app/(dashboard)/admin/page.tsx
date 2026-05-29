'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Activity, PlayCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/auth.store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface QueueSnapshot {
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number };
}
interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export default function AdminPage() {
  const role = useAuthStore((s) => s.user?.role);
  const qc = useQueryClient();

  const queues = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => api.get<QueueSnapshot[]>('/admin/jobs').then((r) => r.data),
    enabled: role === 'ADMIN',
    refetchInterval: 5000,
  });

  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      api.get<{ items: UserRow[]; total: number }>('/admin/users').then((r) => r.data),
    enabled: role === 'ADMIN',
  });

  const triggerPriceSync = useMutation({
    mutationFn: () => api.post('/admin/jobs/price-sync/trigger').then((r) => r.data),
    onSuccess: () => {
      toast.success('Price-sync job queued');
      qc.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });

  const triggerAlerts = useMutation({
    mutationFn: () => api.post('/admin/jobs/alerts/trigger').then((r) => r.data),
    onSuccess: () => {
      toast.success('Alert-evaluation job queued');
      qc.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });

  if (role !== 'ADMIN') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center px-6">
        <ShieldCheck className="h-10 w-10 text-amber-400" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold">Admins only</h2>
        <p className="text-sm text-muted-foreground">
          Sign in with an admin account to access the system console.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <ShieldCheck className="h-5 w-5 text-amber-400" aria-hidden="true" /> Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor jobs, marketplaces, and users.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerPriceSync.mutate()}
          disabled={triggerPriceSync.isPending}
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          Run price sync
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerAlerts.mutate()}
          disabled={triggerAlerts.isPending}
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          Evaluate alerts
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {queues.isLoading
          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)
          : queues.data?.map((q) => (
              <Card key={q.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-primary" aria-hidden="true" /> {q.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-5 gap-1.5 text-center text-xs">
                  {(['waiting', 'active', 'completed', 'failed', 'delayed'] as const).map((k) => (
                    <div key={k} className="rounded-lg bg-muted/30 px-1 py-3">
                      <p className="font-mono text-base font-semibold tabular-nums">{q.counts[k]}</p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                        {k}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data?.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground sm:text-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'ADMIN' ? 'warning' : 'secondary'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {formatDate(u.createdAt)}
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
