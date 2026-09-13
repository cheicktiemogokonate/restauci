"use client";

// Connexion du domaine Clients.

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/motion/input";
import { clientApi } from "@/modules/clients/presentation/client-app/api-client";
import { getSafeClientRedirect } from "@/modules/clients/presentation/client-app/navigation";
import { useAuthStore } from "@/modules/clients/presentation/client-app/stores/auth-store";
import { AlertCircle, LockKeyhole, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const redirectTo = getSafeClientRedirect(searchParams.get("redirect"));
  const registerHref = redirectTo === "/client"
    ? "/client/register"
    : `/client/register?redirect=${encodeURIComponent(redirectTo)}`;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await clientApi.post<{ client: { id: string; nom: string; telephone: string; email?: string | null }; tokens: { accessToken: string } }>("/auth/login", { telephone, password });
      if (!result.success || !result.data) {
        setError(result.error ?? "Impossible de vous connecter.");
        return;
      }
      setAuth({ accessToken: result.data.tokens.accessToken, user: result.data.client });
      router.push(redirectTo);
    });
  };

  return (
    <>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">Connexion</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Accédez à vos commandes et à votre profil.
      </p>
      <form method="post" action="" onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          id="login-phone"
          label="Téléphone"
          leftIcon={<Phone />}
          type="tel"
          name="telephone"
          autoComplete="tel"
          inputMode="tel"
          value={telephone}
          onChange={setTelephone}
          placeholder="+225 07 XX XX XX XX"
          required
        />
        <Input
          id="login-password"
          label="Mot de passe"
          leftIcon={<LockKeyhole />}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />
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
          {isPending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href={registerHref} className="font-semibold text-primary hover:underline">
          Inscrivez-vous
        </Link>
      </p>
    </>
  );
}
