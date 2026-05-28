'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Globe, XCircle } from 'lucide-react';
import { marketplacesApi } from '@/features/marketplaces/marketplaces.api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function MarketplacesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketplaces'],
    queryFn: marketplacesApi.list,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketplaces</h1>
        <p className="text-sm text-muted-foreground">
          Connected marketplace providers — built on a pluggable abstraction layer.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)
          : data?.map((m) => (
              <Card key={m.id} className="transition hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">{m.slug}</p>
                      </div>
                    </div>
                    {m.isActive ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <XCircle className="h-3 w-3" /> Disabled
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                      <p className="text-muted-foreground">Currency</p>
                      <p className="font-medium">{m.baseCurrency}</p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-muted/20 p-2">
                      <p className="text-muted-foreground">Provider</p>
                      <p className="font-medium">
                        {m.providerAvailable ? 'Available' : 'Not registered'}
                      </p>
                    </div>
                  </div>
                  {m.websiteUrl && (
                    <a
                      href={m.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex text-xs text-primary hover:underline"
                    >
                      {m.websiteUrl} →
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
