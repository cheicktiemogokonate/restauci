"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";

export function ClientRegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const nom = formData.get("nom") as string;
    const telephone = formData.get("telephone") as string;
    const password = formData.get("password") as string;

    clientApi
      .post<{
        client: { id: string; nom: string; telephone: string };
        tokens: { accessToken: string; refreshToken: string };
      }>("/auth/register", { nom, telephone, password })
      .then((result) => {
        if (!result.success || !result.data) {
          setError(result.error ?? "Une erreur est survenue");
          return;
        }

        setAuth({
          accessToken: result.data.tokens.accessToken,
          refreshToken: result.data.tokens.refreshToken,
          user: result.data.client,
        });

        router.push("/client");
      })
      .catch(() => {
        setError("Une erreur est survenue");
      })
      .finally(() => {
        setIsPending(false);
      });
  };

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Créer un compte
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Rejoignez RestauCI pour commander
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Nom complet
          </label>
          <input
            type="text"
            name="nom"
            placeholder="Koné Adjoua"
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Téléphone
          </label>
          <input
            type="tel"
            name="telephone"
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
            name="password"
            required
            minLength={6}
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
          {isPending ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Déjà un compte ?{" "}
        <a
          href="/client/login"
          className="text-green-700 font-medium hover:underline"
        >
          Connectez-vous
        </a>
      </p>
    </div>
  );
}
