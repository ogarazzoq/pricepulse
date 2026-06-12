'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Activity, PlayCircle, Users, Store, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/auth.store';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

interface QueueSnapshot {
  name: string;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number };
}
interface UserRow {
  id: string; email: string; name: string; role: 'USER' | 'ADMIN'; createdAt: string;
}
interface MarketplaceRow {
  id: string; slug: string; name: string; logoUrl?: string; websiteUrl?: string;
  baseCurrency: string; isActive: boolean; providerAvailable: boolean;
}

export default function AdminPage() {
  const role = useAuthStore((s) => s.user?.role);
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', logoUrl: '', websiteUrl: '', baseCurrency: 'USD' });

  const queues = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => api.get<QueueSnapshot[]>('/admin/jobs').then((r) => r.data),
    enabled: role === 'ADMIN', refetchInterval: 5000,
  });
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<{ items: UserRow[]; total: number }>('/admin/users').then((r) => r.data),
    enabled: role === 'ADMIN',
  });
  const marketplaces = useQuery({
    queryKey: ['admin-marketplaces'],
    queryFn: () => api.get<MarketplaceRow[]>('/admin/marketplaces').then((r) => r.data),
    enabled: role === 'ADMIN',
  });

  const triggerPriceSync = useMutation({
    mutationFn: () => api.post('/admin/jobs/price-sync/trigger').then((r) => r.data),
    onSuccess: () => { toast.success('Price-sync job queued'); qc.invalidateQueries({ queryKey: ['admin-jobs'] }); },
  });
  const triggerAlerts = useMutation({
    mutationFn: () => api.post('/admin/jobs/alerts/trigger').then((r) => r.data),
    onSuccess: () => { toast.success('Alert-evaluation job queued'); qc.invalidateQueries({ queryKey: ['admin-jobs'] }); },
  });
  const toggleMarketplace = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/marketplaces/${id}`, { isActive }).then((r) => r.data),
    onSuccess: () => { toast.success('Marketplace updated'); qc.invalidateQueries({ queryKey: ['admin-marketplaces'] }); },
  });
  const deleteMarketplace = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/marketplaces/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Marketplace deleted'); qc.invalidateQueries({ queryKey: ['admin-marketplaces'] }); },
  });
  const createMarketplace = useMutation({
    mutationFn: () => api.post('/admin/marketplaces', form).then((r) => r.data),
    onSuccess: () => {
      toast.success('Marketplace created!');
      setAddOpen(false);
      setForm({ slug: '', name: '', logoUrl: '', websiteUrl: '', baseCurrency: 'USD' });
      qc.invalidateQueries({ queryKey: ['admin-marketplaces'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create'),
  });
  const promoteUser = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch('/admin/users/role', { userId, role }).then((r) => r.data),
    onSuccess: () => { toast.success('User role updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
  });

  if (role !== 'ADMIN') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center px-6">
        <ShieldCheck className="h-10 w-10 text-amber-400" />
        <h2 className="mt-3 text-lg font-semibold">Admins only</h2>
        <p className="text-sm text-muted-foreground">Sign in with an admin account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <ShieldCheck className="h-5 w-5 text-amber-400" /> Admin Console
        </h1>
        <p className="text-sm text-muted-foreground">Monitor jobs, manage marketplaces and users.</p>
      </div>

      {/* Job Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => triggerPriceSync.mutate()} disabled={triggerPriceSync.isPending}>
          <PlayCircle className="h-4 w-4 mr-1" /> Run price sync
        </Button>
        <Button variant="outline" size="sm" onClick={() => triggerAlerts.mutate()} disabled={triggerAlerts.isPending}>
          <PlayCircle className="h-4 w-4 mr-1" /> Evaluate alerts
        </Button>
      </div>

      {/* Queue Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {queues.isLoading
          ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)
          : queues.data?.map((q) => (
            <Card key={q.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" /> {q.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-5 gap-1.5 text-center text-xs">
                {(['waiting', 'active', 'completed', 'failed', 'delayed'] as const).map((k) => (
                  <div key={k} className="rounded-lg bg-muted/30 px-1 py-3">
                    <p className="font-mono text-base font-semibold tabular-nums">{q.counts[k]}</p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{k}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Marketplaces */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" /> Marketplaces
          </CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add Marketplace
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Marketplace</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Slug *</label>
                    <Input placeholder="amazon" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Name *</label>
                    <Input placeholder="Amazon" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Logo URL</label>
                  <Input placeholder="https://..." value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Website URL</label>
                  <Input placeholder="https://..." value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Currency</label>
                  <Input placeholder="USD" value={form.baseCurrency} onChange={e => setForm(f => ({ ...f, baseCurrency: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={() => createMarketplace.mutate()} disabled={!form.slug || !form.name || createMarketplace.isPending}>
                    {createMarketplace.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {marketplaces.isLoading ? <Skeleton className="h-40" /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Slug</TableHead>
                    <TableHead className="hidden sm:table-cell">Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Provider</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketplaces.data?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {m.logoUrl && <img src={m.logoUrl} alt="" className="h-5 w-5 object-contain rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                          {m.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground font-mono">{m.slug}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{m.baseCurrency}</TableCell>
                      <TableCell>
                        <Badge variant={m.isActive ? 'success' : 'secondary'}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={m.providerAvailable ? 'default' : 'outline'} className="text-xs">
                          {m.providerAvailable ? 'Connected' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => toggleMarketplace.mutate({ id: m.id, isActive: !m.isActive })}
                            title={m.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {m.isActive
                              ? <ToggleRight className="h-4 w-4 text-green-500" />
                              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete "${m.name}"?`)) deleteMarketplace.mutate(m.id); }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.isLoading ? <Skeleton className="h-40" /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data?.items.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'ADMIN' ? 'warning' : 'secondary'}>{u.role}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => promoteUser.mutate({ userId: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                          disabled={promoteUser.isPending}
                        >
                          {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
