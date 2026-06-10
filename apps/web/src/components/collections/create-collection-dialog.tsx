'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { collectionsApi } from '@/features/collections';
import type { Collection, CreateCollectionDto, UpdateCollectionDto } from '@/features/collections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { COLLECTION_COLORS } from './collection-colors';
import { COLLECTION_ICONS, getCollectionIcon } from './collection-icons';

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection; // If provided, edit mode
}

export function CreateCollectionDialog({
  open,
  onOpenChange,
  collection,
}: CreateCollectionDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!collection;

  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [color, setColor] = useState(collection?.color || COLLECTION_COLORS[0].value);
  const [icon, setIcon] = useState(collection?.icon || COLLECTION_ICONS[0].value);
  const [isDefault, setIsDefault] = useState(collection?.isDefault || false);

  const createMutation = useMutation({
    mutationFn: (dto: CreateCollectionDto) => collectionsApi.create(dto),
    onSuccess: () => {
      toast.success('Collection created successfully', {
        description: `${name} is now ready to use`,
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to create collection', {
        description: error?.response?.data?.message || 'Please try again',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateCollectionDto) =>
      collectionsApi.update(collection!.id, dto),
    onSuccess: () => {
      toast.success('Collection updated successfully', {
        description: `${name} has been updated`,
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections', collection!.id] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update collection', {
        description: error?.response?.data?.message || 'Please try again',
      });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor(COLLECTION_COLORS[0].value);
    setIcon(COLLECTION_ICONS[0].value);
    setIsDefault(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Collection name is required');
      return;
    }

    const dto = {
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      icon,
      isDefault,
    };

    if (isEdit) {
      updateMutation.mutate(dto);
    } else {
      createMutation.mutate(dto);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Collection' : 'Create Collection'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update your collection details and preferences'
              : 'Organize your saved products into custom collections'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="collection-name">Name *</Label>
            <Input
              id="collection-name"
              placeholder="Gaming Setup, Wishlist, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="collection-desc">Description</Label>
            <Textarea
              id="collection-desc"
              placeholder="What products belong here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {COLLECTION_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  disabled={isPending}
                  className="group relative flex h-10 w-full items-center justify-center rounded-md border-2 transition-all hover:scale-105 disabled:opacity-50"
                  style={{
                    borderColor: color === c.value ? c.value : 'transparent',
                    backgroundColor: c.light,
                  }}
                  aria-label={`Select ${c.name} color`}
                >
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: c.value }}
                  />
                  {color === c.value && (
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-md"
                      style={{ backgroundColor: c.value }}
                    >
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-5 gap-2">
              {COLLECTION_ICONS.slice(0, 10).map((i) => {
                const IconComponent = i.icon;
                return (
                  <button
                    key={i.value}
                    type="button"
                    onClick={() => setIcon(i.value)}
                    disabled={isPending}
                    className="flex h-12 items-center justify-center rounded-md border-2 transition-all hover:border-primary hover:scale-105 disabled:opacity-50"
                    style={{
                      borderColor: icon === i.value ? color : 'hsl(var(--border))',
                      backgroundColor:
                        icon === i.value ? `${color}10` : 'transparent',
                    }}
                    aria-label={`Select ${i.name} icon`}
                  >
                    <IconComponent
                      className="h-5 w-5"
                      style={{ color: icon === i.value ? color : undefined }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Collection Toggle */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Checkbox
              id="is-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              disabled={isPending}
            />
            <div className="flex-1">
              <Label
                htmlFor="is-default"
                className="cursor-pointer font-medium leading-none"
              >
                Default Collection
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                New saved products will be added here automatically
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
