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
  refreshToken: string | null;
  user: ClientUser | null;
  isAuthenticated: boolean;

  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: ClientUser;
  }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),

      setAccessToken: (token) => set({ accessToken: token }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "restauci-client-auth",
      storage: createJSONStorage(() => localStorage),
      // On NE persiste QUE le refreshToken et le user.
      // L'accessToken reste en mémoire et est régénéré au chargement
      // de l'app via le refreshToken (voir useInitAuth).
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
