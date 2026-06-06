import React, { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ChefHat,
  Loader2,
} from "lucide-react";
import { PasswordStrength } from "./types";

interface AuthFormProps {
  authMode: "login" | "register";
  fullName: string;
  email: string;
  password: string;
  rememberMe: boolean;
  loading: boolean;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

const getPasswordStrength = (pass: string): PasswordStrength => {
  if (!pass) return { score: 0, text: "Vide", color: "bg-gray-150" };
  if (pass.length < 5) return { score: 1, text: "Trop court", color: "bg-red-500" };
  if (pass.length < 8) return { score: 3, text: "Moyen", color: "bg-amber-500" };
  const hasLetters = /[a-zA-Z]/.test(pass);
  const hasNumbers = /[0-9]/.test(pass);
  if (hasLetters && hasNumbers) {
    return { score: 5, text: "Sécurisé", color: "bg-[#0A6A44]" };
  }
  return { score: 4, text: "Correct", color: "bg-[#0F8A5F]" };
};

export default function AuthForm({
  authMode,
  fullName,
  email,
  password,
  rememberMe,
  loading,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onSubmit,
  onToggleMode,
}: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const strength = getPasswordStrength(password);

  return (
    <div className="p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-white">
      {/* Top-Left Soft Handdrawn Leaf Vector Illustration */}
      <div className="absolute top-0 left-0 pointer-events-none text-brand-green/8 opacity-65 translate-x-3 translate-y-3">
        <svg width="140" height="140" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 90C40 80 55 60 62 45M62 45C68 35 72 20 85 10M62 45C55 40 45 42 38 48C30 55 28 65 28 65M62 45C72 48 80 43 85 32C90 22 88 15 88 15M85 10C80 18 78 28 82 32M28 65C18 70 12 80 10 90Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M42 63C38 58 35 52 38 48C41 44 48 45 52 50C56 55 58 62 55 66C52 70 46 68 42 63Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="currentColor" fillOpacity="0.05"/>
          <path d="M22 80C18 75 18 70 20 68" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Logo Header */}
      <div className="flex flex-col mb-1 shadow-xs z-10">
        <div className="flex items-center gap-2">
          <div className="w-8.5 h-8.5 rounded-lg bg-[#0F8A5F] flex items-center justify-center shadow-xs">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-black text-xl tracking-tight text-brand-dark">
            Restau<span className="text-[#0F8A5F]">CI</span>
          </span>
        </div>
        <span className="text-[10px] text-[#0F8A5F] font-semibold tracking-wide ml-10.5 mt-0.5 block">
          L'allié de votre restaurant
        </span>
      </div>

      {/* Inner Interactive Form Area */}
      <div className="my-auto z-10 pt-6">
        {/* Heading Title with Outline Chefhat and Shine lines */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <div className="relative inline-block mr-1">
            <ChefHat className="h-6 w-6 text-emerald-600/90 -rotate-12" />
          </div>

          <div className="relative inline-flex items-center">
            <h3 className="text-2xl font-black text-brand-dark tracking-tight">
              {authMode === "register" ? "Bienvenue !" : "Bon retour !"}
            </h3>

            {/* Glowing small handdrawn streak accents on the right */}
            <div className="flex flex-col gap-0.5 ml-2.5">
              <div className="w-2.5 h-0.5 bg-[#0F8A5F] rounded-full rotate-[15deg]" />
              <div className="w-3.5 h-0.5 bg-[#0F8A5F] rounded-full ml-1" />
              <div className="w-2.5 h-0.5 bg-[#0F8A5F] rounded-full rotate-[-15deg] ml-0.5" />
            </div>
          </div>
        </div>

        {/* Tagline / Subtitle description */}
        <p className="text-xs text-brand-dark/60 font-medium mb-7">
          {authMode === "register" ? (
            "Inscrivez-vous maintenant pour commencer à gérer et optimiser vos services culinaires."
          ) : (
            "Connectez-vous à votre compte pour continuer à piloter votre restaurant."
          )}
        </p>

        {/* Active Form */}
        <form onSubmit={onSubmit} className="space-y-4.5">
          {authMode === "register" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-brand-dark/85 block tracking-wide">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => onFullNameChange(e.target.value)}
                  placeholder="Entrez votre nom complet"
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-gray-250/20 bg-gray-50/50 hover:bg-white text-brand-dark placeholder-gray-400/80 outline-none focus:border-[#0F8A5F]/55 focus:ring-2 focus:ring-[#0F8A5F]/10 focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-brand-dark/85 block tracking-wide">
              Adresse e-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Entrez votre adresse e-mail"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-gray-250/20 bg-gray-50/50 hover:bg-white text-brand-dark placeholder-gray-400/80 outline-none focus:border-[#0F8A5F]/55 focus:ring-2 focus:ring-[#0F8A5F]/10 focus:bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-extrabold text-brand-dark/85 tracking-wide">
                Mot de passe
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder={authMode === "register" ? "Créez votre mot de passe" : "Entrez votre mot de passe"}
                className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-xl border border-gray-250/20 bg-gray-50/50 hover:bg-white text-brand-dark placeholder-gray-400/80 outline-none focus:border-[#0F8A5F]/55 focus:ring-2 focus:ring-[#0F8A5F]/10 focus:bg-white transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-brand-dark cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Login controls */}
          {authMode === "login" && (
            <div className="flex items-center justify-between py-1 text-xs select-none">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => onRememberMeChange(e.target.checked)}
                  className="rounded border-gray-300 text-[#0F8A5F] focus:ring-[#0F8A5F] accent-[#0F8A5F] h-4.5 w-4.5 cursor-pointer"
                />
                <span className="text-[11.5px] font-bold text-gray-600">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-[11.5px] text-[#0F8A5F] hover:text-[#0A6A44] hover:underline font-bold"
                onClick={() => alert("Réinitialisation de mot de passe simulée pour RestauCI.")}
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* Password Strength Meter */}
          {authMode === "register" && (
            <div className="pt-1 flex items-center justify-between gap-3 text-[10px]">
              <div className="flex gap-1.5 flex-1">
                {[1, 2, 3, 4, 5].map((index) => {
                  const scoreNeeded = index;
                  const isFilled = strength.score >= scoreNeeded;
                  return (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                        isFilled ? strength.color : "bg-gray-150"
                      }`}
                    />
                  );
                })}
              </div>

              <span
                className={`font-bold transition-colors ${
                  strength.score > 0 ? "text-[#0F8A5F]" : "text-gray-400"
                }`}
              >
                {strength.text}
              </span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0F8A5F] hover:bg-[#0A6A44] disabled:bg-emerald-800/85 text-white font-bold rounded-xl text-xs sm:text-xs tracking-wide shadow-md shadow-[#0f8a5f22] hover:shadow-lg transition-all transform hover:-translate-y-[1px] active:translate-y-0 flex items-center justify-between px-5 cursor-pointer mt-6"
          >
            {loading ? (
              <div className="mx-auto flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Authentification sécurisée...
              </div>
            ) : (
              <>
                <span>{authMode === "register" ? "Créer mon compte" : "Se connecter"}</span>
                <ChevronRight className="h-4.5 w-4.5" />
              </>
            )}
          </button>
        </form>

        {/* Or separator */}
        <div className="relative flex py-3 items-center justify-center my-4.5 uppercase text-[10px] tracking-widest text-brand-dark/35 font-semibold">
          <span className="flex-grow border-t border-gray-150"></span>
          <span className="flex-shrink mx-3">ou continuer avec</span>
          <span className="flex-grow border-t border-gray-150"></span>
        </div>

        {/* Social authentication stack */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              // Social login will be handled by parent
            }}
            className="py-2.5 bg-white border border-gray-250/30 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-2xs hover:shadow-sm transition-all transform active:scale-[0.99] cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            Google
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              // Social login will be handled by parent
            }}
            className="py-2.5 bg-white border border-gray-250/30 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-2xs hover:shadow-sm transition-all transform active:scale-[0.99] cursor-pointer"
          >
            <svg className="h-4.5 w-4.5 text-black" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.11.09 2.24-.55 2.95-1.39z" />
            </svg>
            Apple
          </button>
        </div>
      </div>

      {/* Bottom Form Toggler */}
      <div className="mt-8 z-10 text-center text-xs">
        {authMode === "register" ? (
          <span className="text-gray-500 font-semibold">
            Déjà un compte ?{" "}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-[#0F8A5F] hover:text-[#0A6A44] font-bold hover:underline cursor-pointer ml-1"
            >
              Se connecter
            </button>
          </span>
        ) : (
          <span className="text-gray-500 font-semibold">
            Vous n'avez pas encore de compte ?{" "}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-[#0F8A5F] hover:text-[#0A6A44] font-bold hover:underline cursor-pointer ml-1"
            >
              Créer un compte
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
