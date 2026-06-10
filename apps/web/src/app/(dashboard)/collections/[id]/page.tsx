'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { HeartButton } from '@/components/products/heart-button';
import { collectionsApi } from '@/features/collections';
import { getCollectionIcon } from '@/components/collections/collection-icons';
import { formatCurrency } from '@/lib/utils';

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const collectionId = params.id;

  const { data: collection, isLoading, error } = useQuery({
    queryKey: ['collections', collectionId],
    queryFn: () => collectionsApi.findOne(collectionId),
    enabled: !!collectionId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <EmptyState
        title="Collection not found"
        description="This collection may have been deleted or you don't have access"
        action={
          <Button onClick={() => router.push('/collections')} variant="outline">
            Back to Collections
          </Button>
        }
      />
    );
  }

  const IconComponent = getCollectionIcon(collection.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/collections')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${collection.color}15` }}
            >
              <IconComponent className="h-6 w-6" style={{ color: collection.color }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              )}
            </div>
          </div>
        </div>

        <Badge variant="outline" className="self-start sm:self-auto">
          {collection.products.length} products
        </Badge>
      </div>

      {/* Products Grid */}
      {collection.products.length > 0 ? (
        <ul className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} collectionId={collectionId} />
            </li>
          ))}
        </ul>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title="No products in this collection"
            description="Products you add to this collection will appear here"
            action={
              <Button onClick={() => router.push('/products')} variant="outline">
                Browse Products
              </Button>
            }
          />
        </motion.div>
      )}
    </motion.div>
  );
}

function ProductCard({
  product,
  collectionId,
}: {
  product: {
    id: string;
    slug: string;
    title: string;
    imageUrl?: string;
    lowestPrice?: number;
    savedAt: string;
  };
  collectionId: string;
}) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="ring-focus group block h-full rounded-xl"
      aria-label={`View details for ${product.title}`}
    >
      <Card className="flex h-full flex-col overflow-hidden transition hover:border-primary/40 hover:shadow-[0_8px_28px_-12px_hsl(var(--primary)/0.4)]">
        <div className="relative aspect-[4/3] bg-muted/30">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-4 transition group-hover:scale-105"
            />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-end p-2.5">
            <HeartButton productId={product.id} className="bg-background/80 backdrop-blur" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{product.title}</h3>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="min-w-0">
              {product.lowestPrice != null ? (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    From
                  </p>
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {formatCurrency(product.lowestPrice, 'USD')}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Catalog only</p>
              )}
            </div>

            <Badge variant="outline" className="text-[10px]">
              {new Date(product.savedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
