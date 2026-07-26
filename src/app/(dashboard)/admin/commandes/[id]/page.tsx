import { CommandeItemsAdminTable } from "@/components/admin/commande-items-admin-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Button } from "@/components/ui/button";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { getCommandeStatusMeta } from "@/lib/config/commande-status";
import { getCommandeDetailAdmin } from "@/lib/db/queries-admin";
import { formatDate, formatHeure, formatPrix } from "@/lib/utils/format";
import { ArrowLeft, CreditCard, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const paiementLabels: Record<string, string> = {
  en_attente: "En attente",
  paye: "Payé",
  echoue: "Échoué",
  rembourse: "Remboursé",
};

export default async function AdminCommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getAdminSession();
  const { id } = await params;
  const commande = await getCommandeDetailAdmin(id);
  if (!commande) notFound();

  const statut = getCommandeStatusMeta(commande.statut);
  const clientNom = commande.clientNom ?? commande.nomClient;
  const clientTelephone = commande.clientTelephone ?? commande.telephoneClient;

  return (
    <AdminPage>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="-ml-3 mb-2">
            <Link href="/admin/support"><ArrowLeft className="h-4 w-4" />Retour au support</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Commande {commande.numero}</h1>
          <p className="mt-1 text-sm text-gray-500">Créée le {formatDate(commande.createdAt)} à {formatHeure(commande.createdAt)}</p>
        </div>
        <StatusBadge
          variant={
            commande.statut === "annulee"
              ? "danger"
              : commande.statut === "servie"
                ? "success"
                : commande.statut === "recue"
                  ? "warning"
                  : "info"
          }
        >
          {statut.label}
        </StatusBadge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900"><Store className="h-4 w-4 text-emerald-600" />Restaurant</div>
          <Link href={`/admin/restaurants/${commande.restaurantId}`} className="font-semibold text-emerald-700 hover:underline">{commande.restaurantNom}</Link>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900"><UserRound className="h-4 w-4 text-emerald-600" />Client</div>
          <p className="font-semibold text-gray-900">{clientNom}</p>
          <p className="mt-1 text-sm text-gray-500">{clientTelephone ?? "Téléphone non renseigné"}</p>
        </section>
      </div>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-bold text-gray-900">Articles commandés</h2></div>
        <CommandeItemsAdminTable items={commande.items} total={commande.total} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900"><CreditCard className="h-4 w-4 text-emerald-600" />Paiement</div>
          {commande.paiementMontant === null ? <p className="text-sm text-gray-500">Aucun paiement associé à cette commande.</p> : <dl className="space-y-2 text-sm"><Info label="Méthode" value={commande.paiementMethode?.replaceAll("_", " ") ?? "—"} /><Info label="Statut" value={paiementLabels[commande.paiementStatut ?? ""] ?? commande.paiementStatut ?? "—"} /><Info label="Montant" value={formatPrix(commande.paiementMontant)} /><Info label="Référence" value={commande.paiementReference ?? "—"} /></dl>}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-4 text-sm font-semibold text-gray-900">Commission plateforme</div>
          {commande.commissionMontant === null ? <p className="text-sm text-gray-500">Aucune commission n’a encore été calculée.</p> : <dl className="space-y-2 text-sm"><Info label="Taux appliqué" value={`${(commande.commissionTauxBps ?? 0) / 100}%`} /><Info label="Montant" value={formatPrix(commande.commissionMontant)} /><Info label="Statut" value={commande.commissionStatut === "en_attente" ? "En attente" : commande.commissionStatut === "payee" ? "Payée" : "Annulée"} /></dl>}
        </section>
      </div>
    </AdminPage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-gray-500">{label}</dt><dd className="capitalize font-medium text-gray-900">{value}</dd></div>;
}
