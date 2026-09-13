"use client";

import {
  createAdminAccountAction,
  reactivateAdminAccountAction,
  resetAdminPasswordAction,
  suspendAdminAccountAction,
} from "@/app/(dashboard)/admin/users/actions";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Input } from "@/components/motion/input";
import { Table, type TableColumn } from "@/components/motion/table";
import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/shared/format";
import { Check, Copy, KeyRound, Plus, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

export interface AdminAccountRow {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  suspendu: boolean;
  dernierConnexion: Date | null;
  createdAt: Date;
}

type Modal =
  | { kind: "create" }
  | { kind: "reset"; account: AdminAccountRow }
  | { kind: "suspend"; account: AdminAccountRow }
  | null;

export function AdminAccountsManager({ accounts, currentAdminId, search }: {
  accounts: AdminAccountRow[];
  currentAdminId: string;
  search?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<Modal>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const closeModal = () => {
    if (!isPending) setModal(null);
  };

  const showCredentials = (password: string) => {
    setModal(null);
    setTemporaryPassword(password);
    setCopied(false);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("search", query);
    else params.delete("search");
    params.set("type", "administrateurs");
    router.push(`?${params.toString()}`);
  };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await createAdminAccountAction({
        nom: String(data.get("nom") ?? ""),
        email: String(data.get("email") ?? ""),
        telephone: String(data.get("telephone") ?? ""),
        actorPassword: String(data.get("actorPassword") ?? ""),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      form.reset();
      showCredentials(result.temporaryPassword);
      toast.success("Compte administrateur créé.");
    });
  };

  const submitReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal?.kind !== "reset") return;
    const actorPassword = String(new FormData(event.currentTarget).get("actorPassword") ?? "");
    startTransition(async () => {
      const result = await resetAdminPasswordAction({ adminId: modal.account.id, actorPassword });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      showCredentials(result.temporaryPassword);
      toast.success("Mot de passe réinitialisé et sessions révoquées.");
    });
  };

  const submitSuspend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal?.kind !== "suspend") return;
    const motif = String(new FormData(event.currentTarget).get("motif") ?? "");
    startTransition(async () => {
      const result = await suspendAdminAccountAction({ adminId: modal.account.id, motif });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setModal(null);
      toast.success("Compte suspendu et sessions révoquées.");
    });
  };

  const columns: TableColumn<AdminAccountRow>[] = [
    {
      key: "nom",
      header: "Administrateur",
      width: "250px",
      cell: (account) => (
        <div className="flex items-center gap-3">
          <CustomAvatar fallbackText={account.nom} alt={account.nom} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">
              {account.nom}{account.id === currentAdminId ? " (vous)" : ""}
            </p>
            <p className="truncate text-xs text-gray-500">{account.email}</p>
          </div>
        </div>
      ),
    },
    { key: "telephone", header: "Téléphone", width: "150px" },
    {
      key: "statut",
      header: "Statut",
      width: "110px",
      cell: (account) => (
        <StatusBadge variant={account.suspendu ? "danger" : "success"}>
          {account.suspendu ? "Suspendu" : "Actif"}
        </StatusBadge>
      ),
    },
    {
      key: "dernierConnexion",
      header: "Dernière connexion",
      width: "160px",
      cell: (account) => account.dernierConnexion ? formatDate(account.dernierConnexion) : "Jamais",
    },
    {
      key: "actions",
      header: "Actions",
      width: "240px",
      align: "right",
      cell: (account) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isPending || account.suspendu} onClick={() => setModal({ kind: "reset", account })}>
            <KeyRound /> Réinitialiser
          </Button>
          {account.suspendu ? (
            <Button type="button" disabled={isPending} onClick={() => startTransition(async () => {
              const result = await reactivateAdminAccountAction(account.id);
              if (result.success) toast.success("Compte réactivé.");
              else toast.error(result.error);
            })}>Réactiver</Button>
          ) : (
            <Button type="button" variant="destructive" disabled={isPending || account.id === currentAdminId} onClick={() => setModal({ kind: "suspend", account })}>Suspendre</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Types de comptes" className="flex gap-1 rounded-xl border bg-white p-1">
          <Button asChild variant="ghost"><Link href="/admin/users?type=restaurateurs">Restaurateurs</Link></Button>
          <Button asChild variant="ghost"><Link href="/admin/users?type=clients">Clients</Link></Button>
          <Button variant="secondary" aria-current="page">Administrateurs</Button>
        </nav>
        <div className="flex flex-col gap-2 sm:flex-row">
          <form onSubmit={submitSearch} className="flex gap-2">
            <Input name="search" type="search" defaultValue={search ?? ""} placeholder="Nom ou email" leftIcon={<Search />} classNames={{ field: "h-9 rounded-lg bg-white" }} />
            <Button type="submit" variant="outline">Rechercher</Button>
          </form>
          <Button type="button" onClick={() => setModal({ kind: "create" })}><Plus /> Créer un admin</Button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Les créations et réinitialisations demandent votre mot de passe. Le nouveau mot de passe généré n’est affiché qu’une fois.
      </div>

      <Table data={accounts} columns={columns} getRowId={(account) => account.id} rowHeight={72} height={Math.min(Math.max(accounts.length * 72 + 48, 190), 520)} className="rounded-xl bg-white" emptyState={<EmptyState icon={<ShieldCheck />} title="Aucun administrateur" description="Créez un compte administrateur pour déléguer les validations." />} />

      <Dialog open={modal?.kind === "create"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitCreate} className="space-y-4">
            <DialogHeader><DialogTitle>Créer un administrateur</DialogTitle><DialogDescription>Un mot de passe fort sera généré et affiché une seule fois.</DialogDescription></DialogHeader>
            <Input name="nom" label="Nom complet" required disabled={isPending} />
            <Input name="email" label="Email" type="email" required disabled={isPending} />
            <Input name="telephone" label="Téléphone" required disabled={isPending} />
            <Input name="actorPassword" label="Votre mot de passe" type="password" autoComplete="current-password" required disabled={isPending} />
            <DialogFooter><Button type="button" variant="outline" onClick={closeModal}>Annuler</Button><Button type="submit" disabled={isPending}>{isPending ? "Création…" : "Créer le compte"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.kind === "reset"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <form onSubmit={submitReset} className="space-y-4">
            <DialogHeader><DialogTitle>Réinitialiser le mot de passe</DialogTitle><DialogDescription>Les sessions de {modal?.kind === "reset" ? modal.account.nom : "ce compte"} seront immédiatement révoquées.</DialogDescription></DialogHeader>
            <Input name="actorPassword" label="Votre mot de passe" type="password" autoComplete="current-password" required disabled={isPending} />
            <DialogFooter><Button type="button" variant="outline" onClick={closeModal}>Annuler</Button><Button type="submit" disabled={isPending}>{isPending ? "Réinitialisation…" : "Confirmer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal?.kind === "suspend"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <form onSubmit={submitSuspend} className="space-y-4">
            <DialogHeader><DialogTitle>Suspendre le compte</DialogTitle><DialogDescription>Cette action coupe immédiatement tous les accès.</DialogDescription></DialogHeader>
            <Textarea name="motif" minLength={5} maxLength={500} required placeholder="Motif de la suspension" disabled={isPending} />
            <DialogFooter><Button type="button" variant="outline" onClick={closeModal}>Annuler</Button><Button type="submit" variant="destructive" disabled={isPending}>{isPending ? "Suspension…" : "Suspendre"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(temporaryPassword)} onOpenChange={(open) => !open && setTemporaryPassword(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau mot de passe prêt</DialogTitle><DialogDescription>Copiez ce mot de passe maintenant. Il ne sera plus affiché après fermeture.</DialogDescription></DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
            <code className="min-w-0 flex-1 break-all text-sm font-semibold">{temporaryPassword}</code>
            <Button type="button" variant="outline" size="icon" aria-label="Copier le mot de passe" onClick={async () => {
              if (!temporaryPassword) return;
              await navigator.clipboard.writeText(temporaryPassword);
              setCopied(true);
            }}>{copied ? <Check /> : <Copy />}</Button>
          </div>
          <DialogFooter><Button type="button" onClick={() => setTemporaryPassword(null)}>J’ai copié le mot de passe</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
