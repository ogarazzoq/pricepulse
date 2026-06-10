'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { savedProductsApi } from './saved-products.api';

/**
 * Hook for checking if a product is saved and toggling saved status
 * 
 * Provides optimistic updates for save/unsave operations with automatic
 * rollback on failure.
 * 
 * @param productId - ID of the product to check/toggle
 * @returns Object with isSaved status, save/unsave functions, and isPending state
 * 
 * Requirements: 3.3, 3.4, 3.5
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => savedProductsApi.save(productId),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['saved', productId] });
      await queryClient.cancelQueries({ queryKey: ['saved', 'count'] });

      const previousCheck = queryClient.getQueryData(['saved', productId]);
      const previousCount = queryClient.getQueryData<{ count: number }>([
        'saved',
        'count',
      ]);

      queryClient.setQueryData(['saved', productId], { saved: true });
      if (previousCount) {
        queryClient.setQueryData(['saved', 'count'], {
          count: previousCount.count + 1,
        });
      }

      return { previousCheck, previousCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousCheck) {
        queryClient.setQueryData(['saved', productId], context.previousCheck);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['saved', 'count'], context.previousCount);
      }
      toast.error('Failed to save product. Changes have been reverted.');
    },
  });

  // Unsave mutation
  const unsaveMutation = useMutation({
    mutationFn: () => savedProductsApi.unsave(productId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['saved', productId] });
      await queryClient.cancelQueries({ queryKey: ['saved', 'count'] });

      const previousCheck = queryClient.getQueryData(['saved', productId]);
      const previousCount = queryClient.getQueryData<{ count: number }>([
        'saved',
        'count',
      ]);

      queryClient.setQueryData(['saved', productId], { saved: false });
      if (previousCount && previousCount.count > 0) {
        queryClient.setQueryData(['saved', 'count'], {
          count: previousCount.count - 1,
        });
      }

      return { previousCheck, previousCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: (error, variables, context) => {
      if (context?.previousCheck) {
        queryClient.setQueryData(['saved', productId], context.previousCheck);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['saved', 'count'], context.previousCount);
      }
      toast.error('Failed to unsave product. Changes have been reverted.');
    },
  });

  return {
    isSaved,
    save: saveMutation.mutate,
    unsave: unsaveMutation.mutate,
    isPending: saveMutation.isPending || unsaveMutation.isPending,
  };
}

/**
 * Hook for listing saved products (with pagination)
 * 
 * Fetches a paginated list of the current user's saved products
 * ordered by createdAt descending.
 * 
 * @param page - Page number (default: 1)
 * @param pageSize - Items per page (default: 24)
 * @returns React Query result with paginated saved products
 * 
 * Requirements: 4.2
 * Task: 10.2 - Implement useSavedProducts list hook
 */
export function useSavedProducts(page = 1, pageSize = 24) {
  return useQuery({
    queryKey: ['saved', { page, pageSize }],
    queryFn: () => savedProductsApi.list(page, pageSize),
  });
}

/**
 * Hook for getting saved products count
 * 
 * Fetches the total count of saved products for the current user.
 * Auto-invalidates on save/unsave mutations.
 * 
 * @returns React Query result with saved count
 * 
 * Requirements: 5.2
 */
export function useSavedCount() {
  return useQuery({
    queryKey: ['saved', 'count'],
    queryFn: savedProductsApi.count,
  });
}
