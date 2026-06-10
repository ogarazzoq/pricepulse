'use client';

import { motion } from 'framer-motion';
import { MoreVertical, Pencil, Trash2, Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { collectionsApi, type Collection } from '@/features/collections';
import { getCollectionIcon } from './collection-icons';
import { cn } from '@/lib/utils';

interface CollectionCardProps {
  collection: Collection;
  onEdit: (collection: Collection) => void;
  onClick: (collection: Collection) => void;
  isActive?: boolean;
}

export function CollectionCard({
  collection,
  onEdit,
  onClick,
  isActive,
}: CollectionCardProps) {
  const queryClient = useQueryClient();
  const IconComponent = getCollectionIcon(collection.icon);

  const deleteMutation = useMutation({
    mutationFn: () => collectionsApi.delete(collection.id),
    onSuccess: () => {
      toast.success('Collection deleted', {
        description: `${collection.name} has been removed`,
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (error: any) => {
      toast.error('Failed to delete collection', {
        description: error?.response?.data?.message || 'Please try again',
      });
    },
  });

  const handleDelete = () => {
    if (collection.productCount > 0) {
      const confirmed = window.confirm(
        `This collection contains ${collection.productCount} products. They will be moved to uncategorized. Continue?`
      );
      if (!confirmed) return;
    }
    deleteMutation.mutate();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'group relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg',
          isActive && 'ring-2 ring-primary'
        )}
        onClick={() => onClick(collection)}
        style={{
          borderColor: isActive ? collection.color : undefined,
        }}
      >
        <CardContent className="p-4">
          {/* Icon & Actions */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <motion.div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${collection.color}15`,
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <IconComponent className="h-6 w-6" style={{ color: collection.color }} />
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Collection actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(collection);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="text-destructive focus:text-destructive"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Name & Badge */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base line-clamp-1">{collection.name}</h3>
              {collection.isDefault && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Star className="h-3 w-3 fill-current" />
                  Default
                </Badge>
              )}
            </div>

            {collection.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {collection.description}
              </p>
            )}
          </div>

          {/* Product Count */}
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              {collection.productCount === 0
                ? 'No products'
                : collection.productCount === 1
                ? '1 product'
                : `${collection.productCount} products`}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
