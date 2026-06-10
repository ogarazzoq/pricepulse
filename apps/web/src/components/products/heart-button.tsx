'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSavedProduct } from '@/features/saved-products';

interface HeartButtonProps {
  productId: string;
  className?: string;
}

/**
 * HeartButton component for saving/unsaving products
 * 
 * Displays a heart icon that toggles between outlined and filled states.
 * Handles optimistic updates with automatic rollback on failure.
 * 
 * @param productId - ID of the product to save/unsave
 * @param className - Optional CSS classes
 */
export function HeartButton({ productId, className }: HeartButtonProps) {
  const { isSaved, save, unsave, isPending } = useSavedProduct(productId);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent navigation to product detail page
    e.preventDefault();
    e.stopPropagation();
    
    if (isPending) return;
    
    if (isSaved) {
      unsave();
    } else {
      save();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'group/heart inline-flex items-center justify-center rounded-md p-1.5 transition-all',
        'hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      aria-label={isSaved ? 'Remove from saved' : 'Save product'}
      aria-pressed={isSaved}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-all',
          isSaved
            ? 'fill-red-500 text-red-500 scale-110'
            : 'text-foreground/60 group-hover/heart:text-red-500 group-hover/heart:scale-110',
          isPending && 'animate-pulse',
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{isSaved ? 'Saved' : 'Not saved'}</span>
    </button>
  );
}
