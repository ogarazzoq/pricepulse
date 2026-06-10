import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { savedProductsApi } from './saved-products.api';
import type { SavedProductCheckResponse, SavedProductCountResponse } from './saved-products.types';

/**
 * React Query hook for managing a single product's saved state
 * 
 * Provides optimistic updates with automatic rollback on failure.
 * Automatically invalidates related queries (list, count) on success.
 * 
 * @param productId - ID of the product to manage
 * @returns Object with saved state and mutation functions
 * 
 * @example
 * ```tsx
 * const { isSaved, save, unsave, isPending } = useSavedProduct(productId);
 * 
 * <button onClick={isSaved ? unsave : save} disabled={isPending}>
 *   {isSaved ? 'Remove from saved' : 'Save product'}
 * </button>
 * ```
 */
export function useSavedProduct(productId: string) {
  const queryClient = useQueryClient();
  
  // Check if product is saved
  const { data: checkData } = useQuery({
    queryKey: ['saved', productId],
    queryFn: () => savedProductsApi.check(productId),
    enabled: !!productId,
  });
  
  const isSaved = checkData?.saved ?? false;
  
  // Save mutation with optimistic update
  const saveMutation = useMutation({
    mutationFn: () => savedProductsApi.save(productId),
    onMutate: async () => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['saved', productId] });
      await queryClient.cancelQueries({ queryKey: ['saved', 'count'] });
      
      // Snapshot previous values for rollback
      const previousCheck = queryClient.getQueryData<SavedProductCheckResponse>(['saved', productId]);
      const previousCount = queryClient.getQueryData<SavedProductCountResponse>(['saved', 'count']);
      
      // Optimistically update check state
      queryClient.setQueryData<SavedProductCheckResponse>(['saved', productId], { saved: true });
      
      // Optimistically increment count
      if (previousCount) {
        queryClient.setQueryData<SavedProductCountResponse>(['saved', 'count'], {
          count: previousCount.count + 1,
        });
      }
      
      return { previousCheck, previousCount };
    },
    onSuccess: () => {
      // Invalidate list query to refetch with new item
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousCheck) {
        queryClient.setQueryData(['saved', productId], context.previousCheck);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['saved', 'count'], context.previousCount);
      }
      
      // Show error toast (5 second duration per requirements)
      toast.error('Failed to save product. Changes have been reverted.', {
        duration: 5000,
      });
    },
  });
  
  // Unsave mutation with optimistic update
  const unsaveMutation = useMutation({
    mutationFn: () => savedProductsApi.unsave(productId),
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['saved', productId] });
      await queryClient.cancelQueries({ queryKey: ['saved', 'count'] });
      
      // Snapshot previous values
      const previousCheck = queryClient.getQueryData<SavedProductCheckResponse>(['saved', productId]);
      const previousCount = queryClient.getQueryData<SavedProductCountResponse>(['saved', 'count']);
      
      // Optimistically update check state
      queryClient.setQueryData<SavedProductCheckResponse>(['saved', productId], { saved: false });
      
      // Optimistically decrement count (guard against going negative)
      if (previousCount && previousCount.count > 0) {
        queryClient.setQueryData<SavedProductCountResponse>(['saved', 'count'], {
          count: previousCount.count - 1,
        });
      }
      
      return { previousCheck, previousCount };
    },
    onSuccess: () => {
      // Invalidate list query to remove item
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousCheck) {
        queryClient.setQueryData(['saved', productId], context.previousCheck);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['saved', 'count'], context.previousCount);
      }
      
      // Show error toast (5 second duration per requirements)
      toast.error('Failed to unsave product. Changes have been reverted.', {
        duration: 5000,
      });
    },
  });
  
  return {
    /** Whether the product is currently saved */
    isSaved,
    /** Save the product (optimistic update) */
    save: saveMutation.mutate,
    /** Unsave the product (optimistic update) */
    unsave: unsaveMutation.mutate,
    /** Whether a save/unsave mutation is in flight */
    isPending: saveMutation.isPending || unsaveMutation.isPending,
  };
}
