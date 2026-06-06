"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChefHat,
  Users,
  Loader2,
  Shield,
  Cloud,
  Headphones,
  RefreshCw,
  Bell,
  TrendingUp,
  Grid,
  Star,
  Quote,
  ClipboardList,
  Activity
} from "lucide-react";


export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Password strength logic
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !email ||
      !password
    ) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      const endpoint =  "/api/auth/login";
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

      // Success - redirect
      setTimeout(() => {
        router.push("/restaurateur");
      }, 1500);
    } catch (err) {
      setError("Erreur réseau");
      console.error(err);
      setLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center  p-4 overflow-y-auto">
      {/* Modal Window Scale Entry */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-gray-150 relative min-h-[500px] flex flex-col md:grid md:grid-cols-2"
      >
        {/* ==================================== */}
        {/* LEFT COLUMN: AUTHENTICATION FORM     */}
        {/* ==================================== */}
        <div className="p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-white">
          {/* Top-Left Soft Handdrawn Leaf Vector Illustration */}
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

          {/* Logo Header */}
          <div className="flex items-center gap-2 mb-10 z-10">
            <div className="w-8.5 h-8.5 rounded-lg bg-[#0F8A5F] flex items-center justify-center shadow-xs">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-black text-xl tracking-tight text-brand-dark">
              Restau<span className="text-[#0F8A5F]">CI</span>
            </span>
          </div>

          {/* Inner Interactive Form Area */}
          <div className="my-auto z-10">
            {/* Heading Title */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className="relative inline-block mr-1">
                <ChefHat className="h-6 w-6 text-emerald-600/90 -rotate-12" />
              </div>

              <div className="relative inline-flex items-center">
                <h3 className="text-2xl font-extrabold text-brand-dark tracking-tight">
                  Bienvenue !
                </h3>

                {/* Glowing small handdrawn streak accents */}
                <div className="flex flex-col gap-0.5 ml-2">
                  <div className="w-2.5 h-0.5 bg-[#0F8A5F] rounded-full rotate-[15deg]" />
                  <div className="w-3.5 h-0.5 bg-[#0F8A5F] rounded-full ml-1" />
                  <div className="w-2.5 h-0.5 bg-[#0F8A5F] rounded-full rotate-[-15deg] ml-0.5" />
                </div>
              </div>
            </div>

            {/* Toggle Mode Subtitle */}
            <p className="text-xs text-brand-dark/55 font-medium mb-8">
             
             
      
                  Nouveau sur RestauCI ?{" "}
                  <Link
                    href="/register"
                    className="text-[#0F8A5F] hover:text-[#0A6A44] font-bold underline cursor-pointer"
                  >
                    Créer un compte
                  </Link>

            </p>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Active Form */}
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
                    placeholder={"Entrez votre mot de passe"
                    }
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

              {/* Submit Action Button */}
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
                ) : ("Se connecter à mon compte"
                )}
              </button>
            </form>

            {/* Or separator */}
            <div className="relative flex py-3 items-center justify-center my-4 uppercase text-[10px] tracking-widest text-brand-dark/35 font-bold">
              <div className="flex-grow border-t border-gray-150"></div>
              <span className="flex-shrink mx-3">ou</span>
              <div className="flex-grow border-t border-gray-150"></div>
            </div>

            {/* Social authentication stack */}
            <div className="space-y-2.5">
              <button
                type="button"
                className="w-full py-2.5 bg-white border border-gray-250/30 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-sm transition-all transform active:scale-[0.99] cursor-pointer"
              >
                {/* Google logo */}
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

              <button
                type="button"
                className="w-full py-2.5 bg-white border border-gray-250/30 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-sm transition-all transform active:scale-[0.99] cursor-pointer"
              >
                {/* Apple logo */}
                <svg
                  className="h-4.5 w-4.5 text-black"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.11.09 2.24-.55 2.95-1.39z" />
                </svg>
                Continuer avec Apple
              </button>
            </div>
          </div>

          {/* Footer usage agreement term */}
          <div className="text-center text-[10px] text-brand-dark/45 font-semibold mt-8 z-10 leading-relaxed max-w-xs mx-auto">
            En accédant à votre compte, vous acceptez les{" "}
            <Link href="#" className="text-[#0F8A5F] hover:underline font-bold">
              Conditions d'utilisation
            </Link>
          </div>
        </div>

        {/* ==================================== */}
        {/* RIGHT COLUMN: HIGH QUALITY IMAGE GRID */}
        {/* ==================================== */}
        <div className="hidden md:block relative overflow-hidden h-screen bg-[#03150D]">
        
        {/* Backdrop Chef painting */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800"
            alt="Chef professionnel premium en cuisine"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-[0.70]"
          />
          {/* Deep green cinematic backdrop filter */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#02110a]/95 via-transparent to-black/20" />
        </div>

        {/* Floating elements overlay container */}
        <div className="relative inset-0 flex flex-col justify-between h-full z-10 p-8 lg:p-12">
          
          {/* Top Operational live statistics card */}
          <div className="w-full flex justify-end">
            <div className="bg-[#042114]/94 backdrop-blur-md rounded-2xl p-5.5 border border-emerald-500/15 text-white shadow-2xl max-w-[340px] w-full">
              <div className="flex items-start gap-3 mb-4 select-none text-emerald-400">
                <div className="h-9.5 w-9.5 rounded-full bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center">
                  <Activity className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div className="flex-1 leading-tight">
                  <h4 className="text-[13px] font-extrabold text-white tracking-wide">
                    Pilotez. Analysez. Développez.
                  </h4>
                  <p className="text-[10px] text-white/55 font-semibold mt-0.5">
                    Toutes vos opérations au même endroit.
                  </p>
                </div>
              </div>

              <div className="border-t border-emerald-500/10 mb-4" />

              <div className="space-y-3 select-none">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2.5 text-white/80">
                    <ClipboardList className="h-4 w-4 text-emerald-500/80" />
                    <span>Commandes aujourd'hui</span>
                  </div>
                  <span className="text-[#0cfa9c] font-bold text-sm">128</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2.5 text-white/80">
                    <Grid className="h-4 w-4 text-emerald-500/80" />
                    <span>Tables occupées</span>
                  </div>
                  <span className="text-[#0cfa9c] font-bold text-sm">24</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2.5 text-white/80">
                    <TrendingUp className="h-4 w-4 text-emerald-500/80" />
                    <span>Chiffre d'affaires</span>
                  </div>
                  <span className="text-[#0cfa9c] font-bold text-sm">2 450 €</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2.5 text-white/80">
                    <Bell className="h-4 w-4 text-emerald-500/80" />
                    <span>Alertes de stock</span>
                  </div>
                  <span className="text-[#fca5a5] font-bold text-sm">3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial Quote Bubble */}
          <div className="w-full flex justify-start relative max-w-[340px]">
            <div className="bg-[#042114]/94 backdrop-blur-md rounded-2xl p-5.5 border border-emerald-500/15 text-white shadow-2xl relative w-full mb-2">
              
              <div className="absolute top-0 left-5 -translate-y-1/2 h-8.5 w-8.5 rounded-full bg-[#0F8A5F] border border-emerald-500/35 flex items-center justify-center text-white shadow-md">
                <Quote className="h-4 w-4 text-white fill-white" />
              </div>

              <p className="text-[12px] leading-relaxed text-white/90 font-medium pt-1">
                "RestauCI nous a permis de gagner en efficacité et d'offrir une meilleure expérience à nos clients."
              </p>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80"
                    alt="Sarah L."
                    className="h-8 w-8 rounded-full object-cover border border-emerald-500/20"
                  />
                  <div className="leading-tight">
                    <span className="text-xs font-extrabold text-white block">Sarah L.</span>
                    <span className="text-[9.5px] text-white/60 font-semibold block mt-0.5">Gérante - Bistro Gourmet</span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3.5 w-3.5 fill-[#eab308] text-[#eab308]" />
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
      </motion.div>
    </div>
  );
}

