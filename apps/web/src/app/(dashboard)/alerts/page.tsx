'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BellRing, 
  Pause, 
  Play, 
  Trash2, 
  Download, 
  MoreHorizontal,
  CheckSquare,
  Square,
  Loader2,
  X,
  Archive
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import { alertsApi, type Alert } from '@/features/alerts/alerts.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export default function AlertsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
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

  const bulkPauseMutation = useMutation({
    mutationFn: (alertIds: string[]) => alertsApi.bulkPause(alertIds),
    onSuccess: (result) => {
      toast.success(`${result.success} alerts paused`);
      if (result.failed > 0) toast.warning(`${result.failed} alerts failed`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const bulkResumeMutation = useMutation({
    mutationFn: (alertIds: string[]) => alertsApi.bulkResume(alertIds),
    onSuccess: (result) => {
      toast.success(`${result.success} alerts resumed`);
      if (result.failed > 0) toast.warning(`${result.failed} alerts failed`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (alertIds: string[]) => alertsApi.bulkArchive(alertIds),
    onSuccess: (result) => {
      toast.success(`${result.success} alerts archived`);
      if (result.failed > 0) toast.warning(`${result.failed} alerts failed`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (alertIds: string[]) => alertsApi.bulkDelete(alertIds),
    onSuccess: (result) => {
      toast.success(`${result.success} alerts deleted`);
      if (result.failed > 0) toast.warning(`${result.failed} alerts failed`);
      setSelectedIds([]);
      setIsSelectionMode(false);
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

  const handleSelectAll = () => {
    if (data && selectedIds.length === data.length) {
      setSelectedIds([]);
    } else if (data) {
      setSelectedIds(data.map(a => a.id));
    }
  };

  const handleToggleSelect = (alertId: string) => {
    setSelectedIds(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error('No alerts to export');
      return;
    }

    const csvData = data.map(alert => ({
      Product: alert.productTitle,
      Condition: conditionLabel(alert),
      Channels: alert.channels.join('; '),
      Status: alert.status,
      'Created Date': new Date(alert.createdAt).toLocaleDateString(),
      'Triggered Count': alert.triggeredCount,
      'Last Triggered': alert.lastTriggeredAt 
        ? new Date(alert.lastTriggeredAt).toLocaleDateString()
        : 'Never',
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `alerts-${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
    toast.success('CSV exported successfully');
  };

  const handleCancelSelection = () => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const isPending = 
    bulkPauseMutation.isPending || 
    bulkResumeMutation.isPending || 
    bulkArchiveMutation.isPending ||
    bulkDeleteMutation.isPending;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 sm:space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Get notified the moment a tracked product crosses your threshold.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-2"
        >
          {data && (
            <Badge variant="outline" className="bg-card/60">
              {data.length} alerts
            </Badge>
          )}

          <AnimatePresence mode="wait">
            {isSelectionMode ? (
              <motion.div
                key="selection-actions"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <Badge variant="secondary" className="gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {selectedIds.length} selected
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={selectedIds.length === 0 || isPending}
                      className="gap-2"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => bulkPauseMutation.mutate(selectedIds)}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkResumeMutation.mutate(selectedIds)}>
                      <Play className="mr-2 h-4 w-4" />
                      Resume Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => bulkArchiveMutation.mutate(selectedIds)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelSelection}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cancel</span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="default-actions"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleExportCSV} disabled={!data || data.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setIsSelectionMode(true)}
                      disabled={!data || data.length === 0}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Select Multiple
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {isSelectionMode && data && data.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-muted/50">
              <CardContent className="flex items-center justify-between p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-2"
                >
                  {selectedIds.length === data.length ? (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Select All
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Select alerts to manage them in bulk
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <EmptyState
                icon={<BellRing className="h-5 w-5" />}
                title="No alerts yet"
                description="Open any product page and tap 'Create alert' to start watching its price."
              />
            </motion.div>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="space-y-3 md:hidden">
                <AnimatePresence mode="popLayout">
                  {data.map((a, index) => (
                    <motion.li
                      key={a.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        duration: 0.3,
                        delay: index * 0.05,
                        layout: { duration: 0.3 }
                      }}
                    >
                      <MobileAlertCard
                        alert={a}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedIds.includes(a.id)}
                        onToggleSelect={handleToggleSelect}
                        onToggle={onToggle}
                        onArchive={archive.mutate}
                        conditionLabel={conditionLabel(a)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isSelectionMode && <TableHead className="w-12" />}
                      <TableHead>Product</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {data.map((a, index) => (
                        <motion.tr
                          key={a.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ 
                            duration: 0.3,
                            delay: index * 0.05,
                            layout: { duration: 0.3 }
                          }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          {isSelectionMode && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(a.id)}
                                onCheckedChange={() => handleToggleSelect(a.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Link
                              href={`/products/${a.productId}`}
                              className="ring-focus flex items-center gap-3 rounded-md"
                            >
                              <motion.div 
                                whileHover={{ scale: 1.1 }}
                                className="relative h-9 w-9 overflow-hidden rounded-md bg-muted"
                              >
                                {a.productImageUrl && (
                                  <Image
                                    src={a.productImageUrl}
                                    alt=""
                                    fill
                                    sizes="36px"
                                    className="object-contain p-1"
                                  />
                                )}
                              </motion.div>
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
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MobileAlertCard({
  alert,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onToggle,
  onArchive,
  conditionLabel,
}: {
  alert: Alert;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggle: (alert: Alert) => void;
  onArchive: (id: string) => void;
  conditionLabel: string;
}) {
  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onToggleSelect(alert.id);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute -left-2 -top-2 z-20"
          >
            <div 
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background shadow-lg transition-all",
                isSelected 
                  ? "border-primary bg-primary text-primary-foreground" 
                  : "border-muted-foreground/30 hover:border-primary/50"
              )}
              onClick={handleCardClick}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(alert.id)}
                className="pointer-events-none border-0 bg-transparent"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300",
          isSelected && "border-primary ring-2 ring-primary/20 scale-95"
        )}
      >
        <Link
          href={isSelectionMode ? '#' : `/products/${alert.productId}`}
          onClick={handleCardClick}
          className="ring-focus flex items-center gap-3 p-4"
        >
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted"
          >
            {alert.productImageUrl && (
              <Image
                src={alert.productImageUrl}
                alt=""
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            )}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-medium">{alert.productTitle}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {conditionLabel}
            </p>
          </div>
          <StatusBadge status={alert.status} />
        </Link>
        <div className="flex items-center justify-between gap-2 border-t border-border/40 px-4 py-2">
          <div className="flex flex-wrap gap-1">
            {alert.channels.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
          {!isSelectionMode && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggle(alert)}
                aria-label={alert.status === 'ACTIVE' ? 'Pause alert' : 'Resume alert'}
              >
                {alert.status === 'ACTIVE' ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onArchive(alert.id)}
                aria-label="Archive alert"
              >
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          )}
        </div>
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
