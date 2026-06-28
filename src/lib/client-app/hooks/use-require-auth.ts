"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";

/**
 * Retourne une fonction qui vérifie l'authentification avant
 * d'exécuter une action. Si non connecté, redirige vers /login
 * avec un paramètre de retour.
 *
 * @example
 * const requireAuth = useRequireAuth();
 * const handleCommander = () => {
 *   require helpers.requireAuth(() => {
 *     router.push("/panier");
 *   });
 * };
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (action: () => void) => {
    if (!isAuthenticated) {
      router.push(`/client/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    action();
  };
}
