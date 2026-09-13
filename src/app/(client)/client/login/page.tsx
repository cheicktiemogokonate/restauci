export const revalidate = 0;

import { ClientLoginForm } from "@/modules/clients/presentation/client-login-form";
import { ClientAuthShell } from "@/modules/clients/presentation/client-auth-shell";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Connexion client",
};

export default function LoginClientPage() {
  return (
    <ClientAuthShell eyebrow="Votre espace client" title="Vos bonnes adresses, à portée de main." description="Commandez, suivez votre repas et retrouvez votre historique depuis un seul espace.">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement…</div>}>
        <ClientLoginForm />
      </Suspense>
    </ClientAuthShell>
  );
}
