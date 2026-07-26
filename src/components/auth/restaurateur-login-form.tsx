"use client";

import { AppLogo } from "@/components/ui/app-logo";
import {
  ChefHat,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export function RestaurateurLoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      const endpoint = "/api/auth/login";
      const body = { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Une erreur est survenue");
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/restaurateur");
      }
    } catch (err) {
      setError("Erreur réseau");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-white">
      <div className="absolute top-0 left-0 pointer-events-none text-brand-green/8 opacity-65 translate-x-3 translate-y-3">
        <svg
          width="140"
          height="140"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 90C40 80 55 60 62 45M62 45C68 35 72 20 85 10M62 45C55 40 45 42 38 48C30 55 28 65 28 65M62 45C72 48 80 43 85 32C90 22 88 15 88 15M85 10C80 18 78 28 82 32M28 65C18 70 12 80 10 90Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M42 63C38 58 35 52 38 48C41 44 48 45 52 50C56 55 58 62 55 66C52 70 46 68 42 63Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="currentColor"
            fillOpacity="0.05"
          />
          <path
            d="M22 80C18 75 18 70 20 68"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <AppLogo
        href="/"
        alt="Toutci"
        className="z-10 mb-10"
        iconSizeClassName="size-9"
        textSizeClassName="w-24"
        textVisibilityClassName="block"
      />

      <div className="my-auto z-10">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <div className="relative inline-block mr-1">
            <ChefHat className="h-6 w-6 text-emerald-600/90 -rotate-12" />
          </div>

          <div className="relative inline-flex items-center">
            <h3 className="text-2xl font-extrabold text-brand-dark tracking-tight">
              Bienvenue !
            </h3>

            <div className="flex flex-col gap-0.5 ml-2">
              <div className="w-2.5 h-0.5 bg-[#0F8A5F] rounded-full rotate-[15deg]" />
              <div className="w-3.5 h-0.5 bg-[#0F8A5F] rounded-full ml-1" />
              <div className="w-2.5 h-0.5 bg-[#0F8A5F] rounded-full rotate-[-15deg] ml-0.5" />
            </div>
          </div>
        </div>

        <p className="text-xs text-brand-dark/55 font-medium mb-8">
          Nouveau sur Toutci ?{" "}
          <Link
            href="/register"
            className="text-[#0F8A5F] hover:text-[#0A6A44] font-bold underline cursor-pointer"
          >
            Créer un compte
          </Link>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="restaurateur-email" className="text-[11px] font-bold text-brand-dark/85 block tracking-wide">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="restaurateur-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre adresse e-mail"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-gray-250/20 bg-gray-50/50 hover:bg-white text-brand-dark placeholder-gray-400/80 outline-none focus:border-[#0F8A5F]/55 focus:ring-2 focus:ring-[#0F8A5F]/10 focus:bg-white transition-all shadow-2xs disabled:opacity-50"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="restaurateur-password" className="text-[11px] font-bold text-brand-dark/85 tracking-wide">
                Mot de passe
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="restaurateur-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={"Entrez votre mot de passe"}
                className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-xl border border-gray-250/20 bg-gray-50/50 hover:bg-white text-brand-dark placeholder-gray-400/80 outline-none focus:border-[#0F8A5F]/55 focus:ring-2 focus:ring-[#0F8A5F]/10 focus:bg-white transition-all shadow-2xs disabled:opacity-50"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-brand-dark cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0F8A5F] hover:bg-[#0A6A44] disabled:bg-emerald-800/85 text-white font-bold rounded-xl text-xs sm:text-sm tracking-wide shadow-md shadow-[#0f8a5f22] hover:shadow-lg transition-all transform hover:-translate-y-[1px] active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion…
              </>
            ) : (
              "Se connecter à mon compte"
            )}
          </button>
        </form>

      </div>

      <div className="text-center text-[10px] text-brand-dark/45 font-semibold mt-8 z-10 leading-relaxed max-w-xs mx-auto">
        En accédant à votre compte, vous acceptez les{" "}
        <Link href="/conditions-generales" className="text-[#0F8A5F] hover:underline font-bold">
          Conditions d&apos;utilisation
        </Link>
      </div>
    </div>
  );
}
