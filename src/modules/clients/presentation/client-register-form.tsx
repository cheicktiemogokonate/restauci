"use client";

// Inscription du domaine Clients.

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/motion/input";
import { clientApi } from "@/modules/clients/presentation/client-app/api-client";
import { getSafeClientRedirect } from "@/modules/clients/presentation/client-app/navigation";
import { useAuthStore } from "@/modules/clients/presentation/client-app/stores/auth-store";
import { AlertCircle, LockKeyhole, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function ClientRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const redirectTo = getSafeClientRedirect(searchParams.get("redirect"));
  const loginHref = redirectTo === "/client"
    ? "/client/login"
    : `/client/login?redirect=${encodeURIComponent(redirectTo)}`;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const nom = String(formData.get("nom") ?? "");
    const telephone = String(formData.get("telephone") ?? "");
    const password = String(formData.get("password") ?? "");
    startTransition(async () => {
      const result = await clientApi.post<{ client: { id: string; nom: string; telephone: string; email?: string | null }; tokens: { accessToken: string } }>("/auth/register", { nom, telephone, password });
      if (!result.success || !result.data) {
        setError(result.error ?? "Impossible de créer votre compte.");
        return;
      }
      setAuth({ accessToken: result.data.tokens.accessToken, user: result.data.client });
      router.push(redirectTo);
    });
  };

  return (
    <>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">Créer un compte</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Créez votre compte pour passer et suivre vos commandes.
      </p>
      <form method="post" action="" onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          id="register-name"
          label="Nom complet"
          leftIcon={<UserRound />}
          name="nom"
          autoComplete="name"
          placeholder="Koné Adjoua"
          required
        />
        <Input
          id="register-phone"
          label="Téléphone"
          leftIcon={<Phone />}
          type="tel"
          name="telephone"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+225 07 XX XX XX XX"
          required
        />
        <div>
          <Input
            id="register-password"
            label="Mot de passe"
            leftIcon={<LockKeyhole />}
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">12 caractères minimum.</p>
        </div>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="h-12 w-full rounded-xl"
        >
          {isPending ? "Création du compte…" : "Créer mon compte"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href={loginHref} className="font-semibold text-primary hover:underline">
          Connectez-vous
        </Link>
      </p>
    </>
  );
}
