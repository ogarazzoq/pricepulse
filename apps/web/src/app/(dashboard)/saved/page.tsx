'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Store, 
  Download, 
  Trash2, 
  CheckSquare, 
  Square,
  Loader2,
  MoreHorizontal,
  X,
  Plus,
  FolderOpen,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { HeartButton } from '@/components/products/heart-button';
import { formatCurrency, cn } from '@/lib/utils';
import { savedProductsApi } from '@/features/saved-products/saved-products.api';
import type { SavedProduct } from '@/features/saved-products/saved-products.types';
import { collectionsApi, type Collection } from '@/features/collections';
import { getCollectionIcon } from '@/components/collections/collection-icons';
import { CreateCollectionDialog } from '@/components/collections/create-collection-dialog';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

export default function SavedProductsPage() {
  const searchParams = useSearchParams();
  const selectedCollectionId = searchParams.get('collection');
  
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const pageSize = 24;
  const queryClient = useQueryClient();

  // Fetch collections
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
    staleTime: 30_000,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['saved', 'list', page, pageSize],
    queryFn: () => savedProductsApi.list(page, pageSize),
    staleTime: 30_000,
  });

  const bulkUnsaveMutation = useMutation({
    mutationFn: (productIds: string[]) => savedProductsApi.bulkUnsave(productIds),
    onSuccess: (result) => {
      toast.success(`${result.success} products removed successfully`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} products failed to remove`);
      }
      setSelectedIds([]);
      setIsSelectionMode(false);
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: () => {
      toast.error('Failed to remove products');
    },
  });

  const addToCollectionMutation = useMutation({
    mutationFn: ({ collectionId, productIds }: { collectionId: string; productIds: string[] }) =>
      collectionsApi.addProducts(collectionId, { productIds }),
    onSuccess: (result, variables) => {
      const collection = collections?.find(c => c.id === variables.collectionId);
      toast.success(`Added ${result.added} products to ${collection?.name || 'collection'}`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      setShowAddToCollection(false);
      queryClient.invalidateQueries({ queryKey: ['saved'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: () => {
      toast.error('Failed to add products to collection');
    },
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.product.id));
    }
  };

  const handleToggleSelect = (productId: string) => {
    setSelectedIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkUnsave = () => {
    if (selectedIds.length === 0) return;
    bulkUnsaveMutation.mutate(selectedIds);
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error('No products to export');
      return;
    }

    const csvData = items.map(saved => ({
      Title: saved.product.title,
      'Lowest Price': saved.product.lowestPrice ?? 'N/A',
      Currency: saved.product.currency,
      Marketplaces: saved.product.marketplaceCount,
      'Saved Date': new Date(saved.createdAt).toLocaleDateString(),
      URL: `${window.location.origin}/products/${saved.product.id}`,
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `saved-products-${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
    toast.success('CSV exported successfully');
  };

  const handleCancelSelection = () => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

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
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Saved Products</h1>
          <p className="text-sm text-muted-foreground">
            Products you&apos;ve marked for quick access and price tracking.
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
              {data.total} saved
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
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkUnsave}
                  disabled={selectedIds.length === 0 || bulkUnsaveMutation.isPending}
                  className="gap-2"
                >
                  {bulkUnsaveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Remove</span>
                </Button>
                
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
                    <DropdownMenuItem onClick={handleExportCSV} disabled={items.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setIsSelectionMode(true)}
                      disabled={items.length === 0}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Select Multiple
                    </DropdownMenuItem>
                    {collections && collections.length > 0 && selectedIds.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setShowAddToCollection(true)}
                          disabled={selectedIds.length === 0}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add to Collection
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Collections Filter */}
      {collections && collections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <Button
                  variant={!selectedCollectionId ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                  className="shrink-0"
                >
                  <Link href="/saved">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    All Products
                  </Link>
                </Button>

                {collections.map((collection) => {
                  const IconComponent = getCollectionIcon(collection.icon);
                  const isActive = selectedCollectionId === collection.id;
                  
                  return (
                    <Button
                      key={collection.id}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      asChild
                      className="shrink-0"
                      style={{
                        backgroundColor: isActive ? collection.color : undefined,
                        borderColor: isActive ? collection.color : undefined,
                      }}
                    >
                      <Link href={`/saved?collection=${collection.id}`}>
                        <IconComponent className="mr-2 h-4 w-4" />
                        {collection.name}
                        {collection.productCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-2 h-5 px-1.5 text-xs"
                          >
                            {collection.productCount}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCollectionDialogOpen(true)}
                  className="shrink-0 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {isSelectionMode && items.length > 0 && (
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
                  {selectedIds.length === items.length ? (
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
                  Select products to remove them in bulk
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div role="region" aria-live="polite" aria-busy={isLoading}>
        {error ? (
          <EmptyState
            title="Couldn't load saved products"
            description={(error as any)?.message ?? 'Please retry.'}
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : isLoading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <SavedProductsGrid 
              items={items}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
            
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="mt-4">
                  <CardContent className="flex items-center justify-between p-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <EmptyState
              icon={<Heart className="h-5 w-5" />}
              title="No saved products yet"
              description="Click the heart icon on any product to save it here for quick access and price tracking."
              action={
                <Button variant="default" size="sm" asChild>
                  <Link href="/products">Browse Products</Link>
                </Button>
              }
            />
          </motion.div>
        )}
      </div>

      {/* Create Collection Dialog */}
      <CreateCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
      />

      {/* Add to Collection Dialog */}
      {showAddToCollection && collections && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setShowAddToCollection(false)}
        >
          <div 
            className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Add to Collection</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a collection for {selectedIds.length} product{selectedIds.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {collections.map((collection) => {
                    const IconComponent = getCollectionIcon(collection.icon);
                    return (
                      <motion.button
                        key={collection.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addToCollectionMutation.mutate({ 
                          collectionId: collection.id, 
                          productIds: selectedIds 
                        })}
                        disabled={addToCollectionMutation.isPending}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: collection.color,
                        }}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${collection.color}15` }}
                        >
                          <IconComponent className="h-5 w-5" style={{ color: collection.color }} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{collection.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {collection.productCount} products
                          </p>
                        </div>
                        {addToCollectionMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddToCollection(false)}
                    disabled={addToCollectionMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function SavedProductsGrid({ 
  items,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
}: { 
  items: SavedProduct[];
  isSelectionMode: boolean;
  selectedIds: string[];
  onToggleSelect: (productId: string) => void;
}) {
  return (
    <ul className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence mode="popLayout">
        {items.map((saved, index) => (
          <motion.li
            key={saved.id}
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
            <SavedProductCard 
              saved={saved}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.includes(saved.product.id)}
              onToggleSelect={onToggleSelect}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function SavedProductCard({ 
  saved,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}: { 
  saved: SavedProduct;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (productId: string) => void;
}) {
  const p = saved.product;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onToggleSelect(p.id);
    }
  };

  return (
    <div className="relative h-full">
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
                onCheckedChange={() => onToggleSelect(p.id)}
                className="pointer-events-none border-0 bg-transparent"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        href={isSelectionMode ? '#' : `/products/${p.id}`}
        onClick={handleCardClick}
        className={cn(
          "ring-focus group block h-full rounded-xl transition-transform",
          isSelectionMode && "cursor-pointer",
          isSelected && "scale-95"
        )}
        aria-label={`View details for ${p.title}`}
      >
        <Card 
          className={cn(
            "flex h-full flex-col overflow-hidden transition-all duration-300",
            "hover:border-primary/40 hover:shadow-[0_8px_28px_-12px_hsl(var(--primary)/0.4)]",
            isSelected && "border-primary ring-2 ring-primary/20"
          )}
        >
          <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
            {p.imageUrl && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain p-4"
                />
              </motion.div>
            )}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Badge variant="outline" className="bg-background/80 backdrop-blur">
                  <Store className="h-3 w-3" aria-hidden="true" />
                  <span className="font-medium">{p.marketplaceCount}</span>
                  <span className="sr-only">marketplace offers</span>
                </Badge>
              </motion.div>
              {!isSelectionMode && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <HeartButton productId={p.id} className="bg-background/80 backdrop-blur" />
                </motion.div>
              )}
            </div>
          </div>

          <motion.div 
            className="flex flex-1 flex-col gap-2 p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="line-clamp-2 text-sm font-medium leading-tight">{p.title}</h3>

            <div className="mt-auto flex items-end justify-between gap-2">
              <div className="min-w-0">
                {p.lowestPrice != null ? (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      From
                    </p>
                    <motion.p 
                      className="font-mono text-base font-semibold tabular-nums"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {formatCurrency(p.lowestPrice, p.currency)}
                    </motion.p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Catalog only</p>
                )}
              </div>
            </div>
          </motion.div>
        </Card>
      </Link>
    </div>
  );
}

