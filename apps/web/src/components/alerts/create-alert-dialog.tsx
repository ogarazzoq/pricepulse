'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { alertsApi, type AlertCondition, type NotificationChannel } from '@/features/alerts/alerts.api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle: string;
  suggestedThreshold: number;
}

const CONDITIONS: { id: AlertCondition; label: string; description: string }[] = [
  { id: 'BELOW', label: 'Below', description: 'Notify when price drops below threshold' },
  { id: 'ABOVE', label: 'Above', description: 'Notify when price rises above threshold' },
  { id: 'PERCENT_DROP', label: '% Drop', description: 'Notify on percentage drop from original' },
];

const CHANNELS: NotificationChannel[] = ['EMAIL', 'TELEGRAM', 'IN_APP'];

export function CreateAlertDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
  suggestedThreshold,
}: Props) {
  const qc = useQueryClient();
  const [condition, setCondition] = useState<AlertCondition>('BELOW');
  const [threshold, setThreshold] = useState<number>(suggestedThreshold || 0);
  const [channels, setChannels] = useState<NotificationChannel[]>(['EMAIL', 'IN_APP']);

  const create = useMutation({
    mutationFn: () =>
      alertsApi.create({
        productId,
        condition,
        threshold,
        channels,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert created — we’ll watch the price for you.');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create alert');
    },
  });

  const toggleChannel = (c: NotificationChannel) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-base font-semibold">Create price alert</Dialog.Title>
              <Dialog.Description className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {productTitle}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Condition
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCondition(c.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      condition === c.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">{c.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{c.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {condition === 'PERCENT_DROP' ? 'Drop percent' : 'Threshold ($)'}
              </p>
              <Input
                type="number"
                min={1}
                step={condition === 'PERCENT_DROP' ? 1 : 0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notify me via
              </p>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button key={c} onClick={() => toggleChannel(c)}>
                    <Badge
                      variant={channels.includes(c) ? 'default' : 'outline'}
                      className="cursor-pointer"
                    >
                      {c}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => create.mutate()}
              disabled={create.isPending || threshold <= 0 || channels.length === 0}
            >
              {create.isPending ? 'Creating…' : 'Create alert'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
