"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ClientUser {
  id: string;
  nom: string;
  telephone: string;
  email?: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: ClientUser | null;
  isAuthenticated: boolean;

  setAuth: (data: {
    accessToken: string;
    user: ClientUser;
  }) => void;
  setAccessToken: (token: string) => void;
  updateUser: (user: Partial<ClientUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, user }) =>
        set({
          accessToken,
          user,
          isAuthenticated: true,
        }),

      setAccessToken: (token) => set({ accessToken: token }),

      updateUser: (user) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...user } : null,
        })),

      logout: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "restauci-client-auth",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState>;
        return {
          accessToken: null,
          user: state.user ?? null,
          isAuthenticated: state.isAuthenticated ?? false,
        };
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
