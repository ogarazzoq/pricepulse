'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, FolderOpen } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { collectionsApi, type Collection } from '@/features/collections';
import { CollectionCard } from '@/components/collections/collection-card';
import { SortableCollectionCard } from '@/components/collections/sortable-collection-card';
import { CreateCollectionDialog } from '@/components/collections/create-collection-dialog';
import { useRouter } from 'next/navigation';

export default function CollectionsPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localCollections, setLocalCollections] = useState<Collection[]>([]);

  const { data: collections, isLoading, error, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
    staleTime: 30_000,
  });

  // Update local state when collections change
  useEffect(() => {
    if (collections) {
      setLocalCollections(collections);
    }
  }, [collections]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setLocalCollections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      // TODO: Add API call to persist order
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setDialogOpen(true);
  };

  const handleClick = (collection: Collection) => {
    router.push(`/saved?collection=${collection.id}`);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCollection(undefined);
    }
  };

  const activeCollection = activeId
    ? localCollections.find((c) => c.id === activeId)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Collections</h1>
          <p className="text-sm text-muted-foreground">
            Organize your saved products into custom collections
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-2"
        >
          {collections && (
            <Badge variant="outline" className="bg-card/60">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
            </Badge>
          )}

          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Collection</span>
          </Button>
        </motion.div>
      </div>

      {/* Collections Grid */}
      <div role="region" aria-live="polite" aria-busy={isLoading}>
        {error ? (
          <EmptyState
            title="Couldn't load collections"
            description={(error as any)?.message ?? 'Please retry.'}
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : isLoading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : collections && collections.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={localCollections.map((c) => c.id)}
              strategy={rectSortingStrategy}
            >
              <motion.div
                className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                {localCollections.map((collection) => (
                  <SortableCollectionCard
                    key={collection.id}
                    collection={collection}
                    onEdit={handleEdit}
                    onClick={handleClick}
                  />
                ))}
              </motion.div>
            </SortableContext>
            <DragOverlay>
              {activeCollection ? (
                <div className="opacity-90">
                  <CollectionCard
                    collection={activeCollection}
                    onEdit={handleEdit}
                    onClick={handleClick}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <EmptyState
              icon={<FolderOpen className="h-5 w-5" />}
              title="No collections yet"
              description="Create your first collection to organize your saved products"
              action={
                <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Collection
                </Button>
              }
            />
          </motion.div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <CreateCollectionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        collection={editingCollection}
      />
    </motion.div>
  );
}
