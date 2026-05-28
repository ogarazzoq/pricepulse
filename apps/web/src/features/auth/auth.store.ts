'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './auth.types';

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (u: User | null) => void;
  setHydrated: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      setHydrated: (hydrated) => set({ hydrated }),
      clear: () => set({ user: null }),
    }),
    {
      name: 'pp_auth_user',
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
