import { ClientLoginForm } from "@/components/client-app/client-login-form";
import { ClientAuthShell } from "@/components/client-app/client-auth-shell";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Connexion client",
};

export default function LoginClientPage() {
  return (
    <ClientAuthShell eyebrow="Votre espace client" title="Vos bonnes adresses, à portée de main." description="Commandez, suivez votre repas et retrouvez vos restaurants favoris depuis un seul espace.">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement…</div>}>
        <ClientLoginForm />
      </Suspense>
    </ClientAuthShell>
  );
}
