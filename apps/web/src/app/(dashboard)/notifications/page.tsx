'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { notificationsApi, type NotificationChannel } from '@/features/notifications/notifications.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';

const ICONS: Record<NotificationChannel, React.ComponentType<{ className?: string }>> = {
  EMAIL: Mail,
  TELEGRAM: MessageCircle,
  IN_APP: Smartphone,
};

export default function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Every alert delivered to your inbox, Telegram, or in-app feed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !data?.length ? (
            <EmptyState
              icon={<Bell className="h-5 w-5" />}
              title="No notifications yet"
              description="When your alerts trigger, every delivery will be logged here."
            />
          ) : (
            <ul className="space-y-2">
              {data.map((n) => {
                const Icon = ICONS[n.channel];
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/40 p-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-medium">{n.subject}</p>
                        <Badge
                          variant={
                            n.status === 'SENT'
                              ? 'success'
                              : n.status === 'FAILED'
                              ? 'danger'
                              : 'warning'
                          }
                          className="shrink-0"
                        >
                          {n.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.body.replace(/<[^>]+>/g, ' ').trim().slice(0, 140)}
                      </p>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {n.channel} · {formatDate(n.createdAt, { hour: 'numeric', minute: '2-digit' })}
                        {n.errorMessage && <span className="text-rose-500"> · {n.errorMessage}</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
