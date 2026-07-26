import type { Metadata } from "next";
import { ClientRegisterForm } from "@/components/client-app/client-register-form";
import { ClientAuthShell } from "@/components/client-app/client-auth-shell";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Inscription client",
};

export default function RegisterClientPage() {
  return (
    <ClientAuthShell eyebrow="Votre compte, simplement" title="Commandez local, simplement." description="Créez votre espace pour retrouver vos commandes et commander plus vite la prochaine fois.">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement…</div>}>
        <ClientRegisterForm />
      </Suspense>
    </ClientAuthShell>
  );
}
