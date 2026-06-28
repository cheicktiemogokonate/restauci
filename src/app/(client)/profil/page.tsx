"use client";

import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { clientApi } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function ProfilClientPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [nom, setNom] = useState(user?.nom ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [router, user]);

  if (!user) {
    return null;
  }

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await clientApi.patch("/auth/me", {
        nom,
        email: email || null,
      });
      if (result.success) {
        setMessage({ type: "success", text: "Profil mis à jour" });
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Erreur lors de la mise à jour",
        });
      }
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5">
        <h1 className="text-base font-bold text-gray-900">Mon profil</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Avatar + téléphone (non modifiable) */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4">
          <CustomAvatar
            alt={user.nom}
            fallbackText={user.nom}
            size="xl"
            className="shrink-0 bg-green-700 text-white"
            fallbackClassName="bg-green-700 text-white"
          />
          <div>
            <p className="text-base font-bold text-gray-900">{user.nom}</p>
            <p className="text-sm text-gray-400">{user.telephone}</p>
          </div>
        </div>

        {/* Formulaire édition */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Nom complet
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Email <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          {message && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="w-full py-3 bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>

        {/* Liens */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Link
            href="/commandes"
            className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50"
          >
            <span className="text-sm text-gray-700">Mes commandes</span>
            <svg
              className="w-4 h-4 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
          >
            <span className="text-sm text-red-600 font-medium">
              Se déconnecter
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
