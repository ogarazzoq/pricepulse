'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { CollectionCard } from './collection-card';
import type { Collection } from '@/features/collections';
import { cn } from '@/lib/utils';

interface SortableCollectionCardProps {
  collection: Collection;
  onEdit: (collection: Collection) => void;
  onClick: (collection: Collection) => void;
}

export function SortableCollectionCard({
  collection,
  onEdit,
  onClick,
}: SortableCollectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50 cursor-grabbing'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'absolute -left-2 top-1/2 -translate-y-1/2 z-10',
          'flex items-center justify-center w-8 h-8',
          'rounded-md bg-background/90 backdrop-blur-sm',
          'border border-border/60 shadow-sm',
          'opacity-0 group-hover:opacity-100',
          'transition-all duration-200',
          'hover:bg-accent hover:border-primary/40',
          'cursor-grab active:cursor-grabbing',
          'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring'
        )}
        aria-label="Drag to reorder collection"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Collection card */}
      <div className={cn(
        'transition-all duration-200',
        isDragging && 'ring-2 ring-primary shadow-2xl scale-105'
      )}>
        <CollectionCard
          collection={collection}
          onEdit={onEdit}
          onClick={onClick}
        />
      </div>

      {/* Drop indicator overlay */}
      {isDragging && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 pointer-events-none" />
      )}
    </div>
  );
}
