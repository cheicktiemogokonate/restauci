"use client";

import {
  reactiverRestaurantAction,
  rejeterRestaurantAction,
  suspendreRestaurantAction,
  validerRestaurantAction,
} from "@/lib/actions/admin-restaurants";
import { formatDate, formatPrix } from "@/lib/utils/format";
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
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

interface RestaurantDetailAdminProps {
  restaurant: any;
  commandes: any[];
  totalCommandes: number;
  page: number;
  totalPages: number;
  evolution: { jour: string; count: number; total: number }[];
}

function StatutBadge({
  actif,
  suspendu,
}: {
  actif: boolean;
  suspendu: boolean;
}) {
  if (suspendu)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-4 h-4" />
        Suspendu
      </span>
    );
  if (actif)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-4 h-4" />
        Actif
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-4 h-4" />
      En attente de validation
    </span>
  );
}

function CommandeStatutBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    livree: "bg-emerald-50 text-emerald-700",
    en_cours: "bg-blue-50 text-blue-700",
    annulee: "bg-red-50 text-red-700",
    en_attente: "bg-amber-50 text-amber-700",
  };
  const labels: Record<string, string> = {
    livree: "Livrée",
    en_cours: "En cours",
    annulee: "Annulée",
    en_attente: "En attente",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[statut] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[statut] ?? statut}
    </span>
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
      await validerRestaurantAction(restaurant.id);
    });
  const handleRejeter = () => {
    if (motif.trim().length < 5) return;
    startTransition(async () => {
      await rejeterRestaurantAction(restaurant.id, motif);
      setShowRejetModal(false);
      setMotif("");
    });
  };
  const handleSuspendre = () => {
    if (motif.trim().length < 5) return;
    startTransition(async () => {
      await suspendreRestaurantAction(restaurant.id, motif);
      setShowSuspendModal(false);
      setMotif("");
    });
  };
  const handleReactiver = () =>
    startTransition(async () => {
      await reactiverRestaurantAction(restaurant.id);
    });

  const maxEvolution = Math.max(...evolution.map((e) => Number(e.count)), 1);

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-[#FAFAFA] min-h-full">
      {/* Retour */}
      <Link
        href="/admin/restaurants"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux restaurants
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
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
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleValider}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Valider
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejetModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Rejeter
                </button>
              </>
            )}
            {restaurant.actif && !restaurant.suspendu && (
              <button
                type="button"
                onClick={() => setShowSuspendModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" /> Suspendre
              </button>
            )}
            {restaurant.suspendu && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleReactiver}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Réactiver
              </button>
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
            label: "Taux de commission",
            value: `${(restaurant.tauxCommissionBps / 100).toFixed(1)}%`,
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
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <div
                className={`inline-flex p-2 rounded-xl ${kpi.bg} ${kpi.color} mb-3`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Graphique évolution */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Historique des commandes
          </h2>
          <span className="text-sm text-gray-500 font-medium">
            {totalCommandes} au total
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                N°
              </th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Client
              </th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Statut
              </th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                Mode
              </th>
              <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Total
              </th>
              <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {commandes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 font-mono text-gray-700 font-semibold text-xs">
                  {c.numero}
                </td>
                <td className="px-5 py-3.5 font-medium text-gray-900">
                  {c.nomClient}
                </td>
                <td className="px-5 py-3.5">
                  <CommandeStatutBadge statut={c.statut} />
                </td>
                <td className="px-5 py-3.5 text-gray-500 capitalize hidden md:table-cell">
                  {c.modeCommande}
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                  {formatPrix(c.total)}
                </td>
                <td className="px-5 py-3.5 text-right text-gray-400 text-xs hidden sm:table-cell">
                  {formatDate(c.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {commandes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingBag className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">
              Aucune commande pour ce restaurant
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-1.5">
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Précédent
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?page=${page + 1}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Suivant
                </Link>
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
    </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${danger ? "bg-red-100" : "bg-amber-100"}`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${danger ? "text-red-600" : "text-amber-600"}`}
              />
            </div>
            <h3 className="text-base font-bold text-gray-900">{titre}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            disabled={isPending || motif.trim().length < 5}
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
          >
            {isPending ? "En cours..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
