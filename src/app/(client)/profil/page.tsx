"use client";

import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { clientApi, logoutClient } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, ClipboardList, LogOut, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function ProfilClientPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [nom, setNom] = useState(user?.nom ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) router.replace("/client/login?redirect=%2Fprofil");
  }, [router, user]);

  if (!user) return null;

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await clientApi.patch("/auth/me", { nom, email: email || null });
      if (result.success) {
        updateUser({ nom, email: email || null });
        setMessage({ type: "success", text: "Profil mis à jour." });
      } else {
        setMessage({ type: "error", text: result.error ?? "Impossible de mettre le profil à jour." });
      }
    });
  };

  const handleLogout = async () => {
    await logoutClient();
    router.push("/client");
  };

  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="border-b px-4 py-4"><div className="mx-auto flex max-w-2xl items-start gap-3"><Button asChild variant="ghost" size="icon" className="mt-0.5"><Link href="/client" aria-label="Retour aux restaurants"><ArrowLeft /></Link></Button><div><p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Votre compte</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Mon profil</h1></div></div></header>
      <div className="mx-auto max-w-2xl px-4">
        <section className="flex items-center gap-4 border-b py-6">
          <CustomAvatar alt={user.nom} fallbackText={user.nom} size="xl" className="shrink-0" fallbackClassName="bg-primary text-primary-foreground" />
          <div className="min-w-0"><p className="truncate text-lg font-bold">{user.nom}</p><p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="size-3.5" />{user.telephone}</p></div>
        </section>

        <section aria-labelledby="profile-details-heading" className="border-b py-6">
          <div className="mb-5"><p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Informations</p><h2 id="profile-details-heading" className="mt-1 text-lg font-semibold">Vos coordonnées</h2></div>
          <div className="space-y-4"><div><Label htmlFor="profile-name">Nom complet</Label><div className="relative mt-2"><UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-name" value={nom} onChange={(event) => setNom(event.target.value)} className="h-10 pl-9" /></div></div><div><Label htmlFor="profile-email">E-mail <span className="font-normal text-muted-foreground">(facultatif)</span></Label><div className="relative mt-2"><Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="exemple@email.com" className="h-10 pl-9" /></div></div></div>
          {message ? <Alert variant={message.type === "error" ? "destructive" : "default"} className={message.type === "success" ? "mt-4 border-primary/15 bg-primary/5 text-primary" : "mt-4"}>{message.type === "success" ? <CheckCircle2 /> : <AlertCircle />}<AlertDescription className={message.type === "success" ? "text-primary/85" : undefined}>{message.text}</AlertDescription></Alert> : null}
          <Button type="button" size="lg" disabled={isPending || !nom.trim()} onClick={handleSave} className="mt-5 h-11 rounded-xl">{isPending ? "Enregistrement…" : "Enregistrer les modifications"}</Button>
        </section>

        <section aria-labelledby="profile-links-heading" className="py-5"><h2 id="profile-links-heading" className="sr-only">Raccourcis</h2><Button asChild variant="ghost" className="h-auto w-full justify-between rounded-none px-0 py-4 text-left hover:bg-transparent"><Link href="/commandes"><span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-4" /></span><span><span className="block text-sm font-semibold">Mes commandes</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Suivre ou retrouver une commande</span></span></span><ChevronRight className="text-muted-foreground" /></Link></Button><Separator /><Button type="button" variant="ghost" onClick={handleLogout} className="h-auto w-full justify-between rounded-none px-0 py-4 text-destructive hover:bg-transparent hover:text-destructive"><span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-destructive/10"><LogOut className="size-4" /></span><span className="text-sm font-semibold">Se déconnecter</span></span><ChevronRight /></Button></section>
      </div>
    </main>
  );
}
