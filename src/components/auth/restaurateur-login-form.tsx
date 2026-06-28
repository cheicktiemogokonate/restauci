"use client";

import {
  ChefHat,
  ClipboardList,
  Eye,
  EyeOff,
  Grid,
  Loader2,
  Lock,
  Mail,
  Quote,
  Star,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
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

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "Vide", color: "bg-gray-150" };
    if (pass.length < 5)
      return { score: 1, text: "Trop court", color: "bg-red-500" };
    if (pass.length < 8)
      return { score: 3, text: "Moyen", color: "bg-amber-500" };
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    if (hasLetters && hasNumbers) {
      return { score: 5, text: "Sécurisé", color: "bg-[#0A6A44]" };
    }
    return { score: 4, text: "Correct", color: "bg-[#0F8A5F]" };
  };

  const strength = getPasswordStrength(password);

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

      setTimeout(() => {
        if (data.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/restaurateur");
        }
      }, 1500);
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

      <div className="flex items-center gap-2 mb-10 z-10">
        <div className="w-8.5 h-8.5 rounded-lg bg-[#0F8A5F] flex items-center justify-center shadow-xs">
          <ChefHat className="h-5 w-5 text-white" />
        </div>
        <span className="font-display font-black text-xl tracking-tight text-brand-dark">
          Restau<span className="text-[#0F8A5F]">CI</span>
        </span>
      </div>

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
          Nouveau sur RestauCI ?{" "}
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
            <label className="text-[11px] font-bold text-brand-dark/85 block tracking-wide">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
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
              <label className="text-[11px] font-bold text-brand-dark/85 tracking-wide">
                Mot de passe
              </label>

              <button
                type="button"
                className="text-[10px] text-[#0F8A5F] hover:underline font-bold"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
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
                Configuration sécurisée...
              </>
            ) : (
              "Se connecter à mon compte"
            )}
          </button>
        </form>

        <div className="relative flex py-3 items-center justify-center my-4 uppercase text-[10px] tracking-widest text-brand-dark/35 font-bold">
          <div className="flex-grow border-t border-gray-150"></div>
          <span className="flex-shrink mx-3">ou</span>
          <div className="flex-grow border-t border-gray-150"></div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            className="w-full py-2.5 bg-white border border-gray-250/30 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-sm transition-all transform active:scale-[0.99] cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            Continuer avec Google
          </button>
        </div>
      </div>

      <div className="text-center text-[10px] text-brand-dark/45 font-semibold mt-8 z-10 leading-relaxed max-w-xs mx-auto">
        En accédant à votre compte, vous acceptez les{" "}
        <Link href="#" className="text-[#0F8A5F] hover:underline font-bold">
          Conditions d&apos;utilisation
        </Link>
      </div>
    </div>
  );
}
