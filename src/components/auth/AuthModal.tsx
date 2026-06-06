import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import AuthForm from "./AuthForm";
import RegisterVisual from "./RegisterVisual";
import LoginVisual from "./LoginVisual";
import { foodImages, loginFeatureBadges } from "./data";
import { AuthModalProps } from "./types";

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "register",
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);

  // Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Reset fields on modal toggle or mode toggle
  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setFullName("");
      setEmail("");
      setPassword("");
      setRememberMe(false);
    }
  }, [isOpen, initialMode]);

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (authMode === "register" && !fullName)) return;

    setLoading(true);

    // Simulate real database authorization/account creation
    setTimeout(() => {
      setLoading(false);
      const mockName =
        authMode === "register" ? fullName : email.split("@")[0];
      const displayName =
        mockName.charAt(0).toUpperCase() + mockName.slice(1);

      onSuccess({
        name: displayName,
        email: email,
      });
      onClose();
    }, 1500);
  };

  // Social login handler
  const handleSocialLogin = (provider: "google" | "apple") => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const mockEmail = provider === "google" ? "user@gmail.com" : "user@apple.com";
      const mockName = provider === "google" ? "Demo User" : "Apple user";
      onSuccess({ name: mockName, email: mockEmail });
      onClose();
    }, 1000);
  };

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 overflow-y-auto">
        {/* Modal Window Scale Entry */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-gray-150 relative min-h-[500px] flex flex-col md:grid md:grid-cols-2"
        >
          {/* Close button at absolute corner */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 z-50 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100/80 rounded-full transition-all cursor-pointer"
            aria-label="Fermer la connexion"
          >
            <X className="h-5 w-5" />
          </button>

          {/* LEFT COLUMN: AUTHENTICATION FORM */}
          <AuthForm
            authMode={authMode}
            fullName={fullName}
            email={email}
            password={password}
            rememberMe={rememberMe}
            loading={loading}
            onFullNameChange={setFullName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onRememberMeChange={setRememberMe}
            onSubmit={handleSubmit}
            onToggleMode={() => setAuthMode(authMode === "login" ? "register" : "login")}
          />

          {/* RIGHT COLUMN: REGISTER FOOD IMAGE GRID OR LOGIN VISUAL */}
          <div className="hidden md:block relative overflow-hidden h-[680px] bg-[#03150D]">
            <AnimatePresence mode="wait">
              {authMode === "register" ? (
                <RegisterVisual foodImages={foodImages} />
              ) : (
                <LoginVisual loginFeatureBadges={loginFeatureBadges} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
