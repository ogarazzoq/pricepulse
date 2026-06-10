'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, FolderPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateCollectionDialog } from '@/components/collections/create-collection-dialog';
import { getCollectionIcon } from '@/components/collections/collection-icons';
import { collectionsApi, type Collection } from '@/features/collections';
import { cn } from '@/lib/utils';

interface AddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle: string;
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
}: AddToCollectionDialogProps) {
  const queryClient = useQueryClient();
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
    enabled: open,
  });

  const addToCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      return collectionsApi.addProducts(collectionId, { productIds: [productId] });
    },
    onSuccess: (_, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
      const collection = collections?.find((c) => c.id === collectionId);
      toast.success(`Added to ${collection?.name || 'collection'}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add to collection');
    },
  });

  const removeFromCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      return collectionsApi.removeProduct(collectionId, productId);
    },
    onSuccess: (_, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
      const collection = collections?.find((c) => c.id === collectionId);
      toast.success(`Removed from ${collection?.name || 'collection'}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to remove from collection');
    },
  });

  const handleToggleCollection = async (collectionId: string, isInCollection: boolean) => {
    if (isInCollection) {
      await removeFromCollectionMutation.mutateAsync(collectionId);
      setSelectedCollections((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    } else {
      await addToCollectionMutation.mutateAsync(collectionId);
      setSelectedCollections((prev) => {
        const next = new Set(prev);
        next.add(collectionId);
        return next;
      });
    }
  };

  const handleClose = () => {
    setSelectedCollections(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Add to Collection
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {productTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {collections.map((collection) => {
                const isInCollection = selectedCollections.has(collection.id);
                const isPending =
                  addToCollectionMutation.isPending || removeFromCollectionMutation.isPending;
                const IconComponent = getCollectionIcon(collection.icon);

                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => handleToggleCollection(collection.id, isInCollection)}
                    disabled={isPending}
                    className={cn(
                      'w-full flex items-center justify-between gap-3',
                      'rounded-lg border p-4 text-left transition-all',
                      'hover:bg-accent/50 hover:border-primary/40',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      isInCollection && 'bg-primary/5 border-primary/40'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: collection.color + '20' }}
                      >
                        <IconComponent className="h-5 w-5" style={{ color: collection.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{collection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {collection.productCount || 0} products
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                        isInCollection
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {isInCollection && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<FolderPlus className="h-5 w-5" />}
              title="No collections yet"
              description="Create your first collection to organize products"
            />
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Create Collection Dialog */}
      <CreateCollectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </Dialog>
  );
}
