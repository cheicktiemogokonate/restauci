import { ClientLoginForm } from "@/components/client-app/client-login-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Connexion client — RestauCI",
};

export default function LoginClientPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-center">Chargement...</div>}>
        <ClientLoginForm />
      </Suspense>
    </div>
  );
}
