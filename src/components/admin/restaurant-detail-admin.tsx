"use client";

import {
  reactiverRestaurantAction,
  rejeterRestaurantAction,
  suspendreRestaurantAction,
  validerRestaurantAction,
} from "@/lib/actions/admin-restaurants";
import { formatDate, formatPrix } from "@/lib/utils/format";
import { getCommandeStatusMeta } from "@/lib/config/commande-status";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Table, type TableColumn } from "@/components/motion/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Calendar,
  CheckCircle2,
  MapPin,
  Phone,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  AdminRestaurantDetail,
  AdminRestaurantOrder,
} from "@/lib/db/queries-admin";
import { getAdminRestaurantStatus } from "@/lib/config/admin-workflows";

interface RestaurantDetailAdminProps {
  restaurant: AdminRestaurantDetail;
  commandes: AdminRestaurantOrder[];
  totalCommandes: number;
  page: number;
  totalPages: number;
  evolution: { jour: string; count: number; total: number }[];
}

function StatutBadge({
  actif,
  suspendu,
  motifRejet,
}: {
  actif: boolean;
  suspendu: boolean;
  motifRejet: string | null;
}) {
  const status = getAdminRestaurantStatus({ actif, suspendu, motifRejet });
  if (status === "suspendu")
    return (
      <StatusBadge variant="danger" showIcon={false}>
        <XCircle className="w-4 h-4" />
        Suspendu
      </StatusBadge>
    );
  if (status === "actif")
    return (
      <StatusBadge variant="success" showIcon={false}>
        <CheckCircle2 className="w-4 h-4" />
        Actif
      </StatusBadge>
    );
  if (status === "rejete")
    return (
      <StatusBadge variant="neutral" showIcon={false}>
        <XCircle className="w-4 h-4" />
        Rejeté
      </StatusBadge>
    );
  return (
    <StatusBadge variant="warning" showIcon={false}>
      <AlertTriangle className="w-4 h-4" />
      En attente de validation
    </StatusBadge>
  );
}

function CommandeStatutBadge({ statut }: { statut: string }) {
  const statusMeta = getCommandeStatusMeta(statut);
  return (
    <StatusBadge
      variant={
        statut === "annulee"
          ? "danger"
          : statut === "servie"
            ? "success"
            : statut === "recue"
              ? "warning"
              : "info"
      }
    >
      {statusMeta.label}
    </StatusBadge>
  );
}

export function RestaurantDetailAdmin({
  restaurant,
  commandes,
  totalCommandes,
  page,
  totalPages,
  evolution,
}: RestaurantDetailAdminProps) {
  const [isPending, startTransition] = useTransition();
  const [showRejetModal, setShowRejetModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [motif, setMotif] = useState("");

  const handleValider = () =>
    startTransition(async () => {
      try {
        await validerRestaurantAction(restaurant.id);
        toast.success("Restaurant validé.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "La validation a échoué.");
      }
    });
  const handleRejeter = () => {
    if (motif.trim().length < 5) return;
    startTransition(async () => {
      try {
        const result = await rejeterRestaurantAction(restaurant.id, motif);
        if (result.error) throw new Error(result.error);
        toast.success("Restaurant rejeté.");
        setShowRejetModal(false);
        setMotif("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Le rejet a échoué.");
      }
    });
  };
  const handleSuspendre = () => {
    if (motif.trim().length < 5) return;
    startTransition(async () => {
      try {
        const result = await suspendreRestaurantAction(restaurant.id, motif);
        if (result.error) throw new Error(result.error);
        toast.success("Restaurant suspendu.");
        setShowSuspendModal(false);
        setMotif("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "La suspension a échoué.");
      }
    });
  };
  const handleReactiver = () =>
    startTransition(async () => {
      try {
        await reactiverRestaurantAction(restaurant.id);
        toast.success("Restaurant réactivé.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "La réactivation a échoué.");
      }
    });

  const maxEvolution = Math.max(...evolution.map((e) => Number(e.count)), 1);
  const commandeColumns: TableColumn<AdminRestaurantOrder>[] = [
    {
      key: "numero",
      header: "N°",
      sortable: true,
      width: "140px",
      cell: (commande) => (
        <span className="font-mono text-xs font-semibold text-gray-700">
          {commande.numero}
        </span>
      ),
    },
    {
      key: "nomClient",
      header: "Client",
      sortable: true,
      width: "200px",
      cell: (commande) => (
        <span className="font-medium">{commande.nomClient}</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      width: "150px",
      cell: (commande) => (
        <CommandeStatutBadge statut={commande.statut} />
      ),
    },
    {
      key: "modeCommande",
      header: "Mode",
      sortable: true,
      width: "130px",
      cell: (commande) => (
        <span className="capitalize text-gray-500">{commande.modeCommande}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      width: "130px",
      align: "right",
      cell: (commande) => (
        <span className="font-bold">{formatPrix(commande.total)}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      width: "150px",
      align: "right",
      sortValue: (commande) => new Date(commande.createdAt).getTime(),
      cell: (commande) => (
        <span className="text-xs text-gray-400">
          {formatDate(commande.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <AdminPage>
      {/* Retour */}
      <Link
        href="/admin/restaurants"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux restaurants
      </Link>

      {/* Header */}
      <div className="rounded-xl border bg-white p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <Store className="w-8 h-8 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {restaurant.nom}
                </h1>
                <StatutBadge
                  actif={restaurant.actif}
                  suspendu={restaurant.suspendu}
                  motifRejet={restaurant.motifRejet}
                />
              </div>
              <div className="gap-4 mt-2 text-sm text-gray-500">
                {restaurant.adresse && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {restaurant.adresse}
                  </span>
                )}
                {restaurant.telephone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {restaurant.telephone}
                  </span>
                )}
                {restaurant.proprietaire && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {restaurant.proprietaire.nom}
                    <span className="text-gray-400">
                      ({restaurant.proprietaire.email})
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {!restaurant.actif && !restaurant.suspendu && (
              <>
                <StatefulButton
                  state={isPending ? "loading" : "idle"}
                  loadingText="Validation…"
                  onClick={handleValider}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Valider
                </StatefulButton>
                {!restaurant.motifRejet && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowRejetModal(true)}
                  >
                    <XCircle className="w-4 h-4" /> Rejeter
                  </Button>
                )}
              </>
            )}
            {restaurant.actif && !restaurant.suspendu && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowSuspendModal(true)}
              >
                <AlertTriangle className="w-4 h-4" /> Suspendre
              </Button>
            )}
            {restaurant.suspendu && (
              <StatefulButton
                state={isPending ? "loading" : "idle"}
                loadingText="Réactivation…"
                onClick={handleReactiver}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Réactiver
              </StatefulButton>
            )}
          </div>
        </div>

        {/* Alertes motif */}
        {restaurant.motifSuspension && (
          <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Motif de suspension :</strong>{" "}
              {restaurant.motifSuspension}
            </div>
          </div>
        )}
        {restaurant.motifRejet && !restaurant.actif && (
          <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Motif de rejet :</strong> {restaurant.motifRejet}
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Commandes totales",
            value: restaurant.nombreCommandes,
            icon: ShoppingBag,
            bg: "bg-blue-50",
            color: "text-blue-600",
          },
          {
            label: "Note moyenne",
            value: restaurant.noteMoyenne ? `${restaurant.noteMoyenne}/5` : "—",
            icon: Star,
            bg: "bg-amber-50",
            color: "text-amber-600",
          },
          {
            label: "Abonnement effectif",
            value: restaurant.effectivePlan?.plan?.nom || "—",
            icon: BadgeDollarSign,
            bg: "bg-purple-50",
            color: "text-purple-600",
          },
          {
            label: "Inscrit le",
            value: formatDate(restaurant.createdAt),
            icon: Calendar,
            bg: "bg-gray-50",
            color: "text-gray-600",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border bg-white p-4"
            >
              <div
                className={`inline-flex p-2 rounded-xl ${kpi.bg} ${kpi.color} mb-3`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {typeof kpi.value === "number" ? (
                  <AnimatedNumber value={kpi.value} locale="fr-FR" />
                ) : (
                  kpi.value
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Graphique évolution */}
      <div className="rounded-xl border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">
              Activité sur 30 jours
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            30 derniers jours
          </span>
        </div>
        <div className="flex items-end gap-1.5 h-36 w-full">
          {evolution.map((point) => {
            const heightPct = (Number(point.count) / maxEvolution) * 100;
            const dayLabel = point.jour.split("-")[2] || point.jour;
            return (
              <div
                key={point.jour}
                className="group relative flex-1 flex flex-col items-center justify-end h-full"
              >
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-lg">
                  {point.count} cmd · {formatPrix(point.total)}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
                <div
                  className="w-full bg-emerald-100 group-hover:bg-emerald-500 rounded-t-md transition-colors duration-200"
                  style={{ height: `${heightPct}%`, minHeight: "3px" }}
                />
                <span className="text-[9px] text-gray-400 font-medium mt-2 hidden lg:block">
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Commandes */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Historique des commandes
          </h2>
          <span className="text-sm text-gray-500 font-medium">
            {totalCommandes} au total
          </span>
        </div>
        <Table
          data={commandes}
          columns={commandeColumns}
          getRowId={(commande) => commande.id}
          defaultSort={{ key: "createdAt", direction: "desc" }}
          resizable
          reorderable
          rowHeight={64}
          height={Math.min(Math.max(commandes.length * 64 + 48, 180), 520)}
          emptyState="Aucune commande pour ce restaurant"
        />

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-1.5">
              {page > 1 && (
                <Button asChild variant="outline">
                  <Link href={`?page=${page - 1}`}>Précédent</Link>
                </Button>
              )}
              {page < totalPages && (
                <Button asChild>
                  <Link href={`?page=${page + 1}`}>Suivant</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal rejet */}
      {showRejetModal && (
        <ConfirmModal
          titre="Rejeter ce restaurant"
          description="Le restaurateur sera notifié du motif de rejet. Cette action est définitive."
          confirmLabel="Confirmer le rejet"
          onClose={() => {
            setShowRejetModal(false);
            setMotif("");
          }}
          onConfirm={handleRejeter}
          isPending={isPending}
          motif={motif}
          setMotif={setMotif}
          placeholder="Expliquez le motif du rejet (visible par le restaurateur)..."
          danger
        />
      )}

      {/* Modal suspension */}
      {showSuspendModal && (
        <ConfirmModal
          titre="Suspendre ce restaurant"
          description="Le restaurant sera immédiatement mis hors ligne et ne pourra plus recevoir de commandes."
          confirmLabel="Confirmer la suspension"
          onClose={() => {
            setShowSuspendModal(false);
            setMotif("");
          }}
          onConfirm={handleSuspendre}
          isPending={isPending}
          motif={motif}
          setMotif={setMotif}
          placeholder="Motif de la suspension..."
          danger
        />
      )}
    </AdminPage>
  );
}

function ConfirmModal({
  titre,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  isPending,
  motif,
  setMotif,
  placeholder,
  danger = false,
}: {
  titre: string;
  description?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  motif: string;
  setMotif: (v: string) => void;
  placeholder: string;
  danger?: boolean;
}) {
  return (
    <CenterMorphModal open onOpenChange={(open) => !open && onClose()}>
      <CenterMorphModalContent
        ariaLabel={titre}
        ariaDescribedBy="restaurant-confirm-description"
        className="max-w-md rounded-2xl"
      >
        <div className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2.5 ${danger ? "bg-red-100" : "bg-amber-100"}`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${danger ? "text-red-600" : "text-amber-600"}`}
              />
            </div>
            <h2 className="text-lg font-semibold">{titre}</h2>
          </div>
        {description && (
          <p
            id="restaurant-confirm-description"
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        <Textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder={placeholder}
          className="min-h-24 resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {motif.trim().length}/5 caractères minimum
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Annuler
          </Button>
          <StatefulButton
            variant={danger ? "destructive" : "default"}
            state={isPending ? "loading" : "idle"}
            loadingText="En cours…"
            disabled={isPending || motif.trim().length < 5}
            onClick={onConfirm}
          >
            {confirmLabel}
          </StatefulButton>
        </div>
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  );
}
