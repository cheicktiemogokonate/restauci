"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientApi } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";

export function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await clientApi.post<{
        client: {
          id: string;
          nom: string;
          telephone: string;
          email?: string | null;
        };
        tokens: { accessToken: string; refreshToken: string };
      }>("/auth/login", { telephone, password });

      if (!result.success || !result.data) {
        setError(result.error ?? "Une erreur est survenue");
        return;
      }

      setAuth({
        accessToken: result.data.tokens.accessToken,
        refreshToken: result.data.tokens.refreshToken,
        user: result.data.client,
      });

      const redirectTo = searchParams.get("redirect") ?? "/client";
      router.push(redirectTo);
    });
  };

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Connexion</h1>
      <p className="text-sm text-gray-500 mb-6">
        Accédez à votre compte RestauCI
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Téléphone
          </label>
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+225 07 XX XX XX XX"
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Pas encore de compte ?{" "}
        <a
          href="/client/register"
          className="text-green-700 font-medium hover:underline"
        >
          Inscrivez-vous
        </a>
      </p>
    </div>
  );
}
