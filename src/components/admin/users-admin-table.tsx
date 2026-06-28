"use client";

import { CustomAvatar } from "@/components/shared/avatar-fallback";
import {
  reactiverClientAction,
  reactiverUserAction,
  suspendreClientAction,
  suspendreUserAction,
} from "@/lib/actions/admin-users";
import { cn } from "@/lib/utils";
import { formatDate, formatPrix } from "@/lib/utils/format";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface UsersAdminTableProps {
  type: string;
  data: { items: any[]; total: number; page: number; totalPages: number };
  search?: string;
}

export function UsersAdminTable({ type, data, search }: UsersAdminTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [motifModal, setMotifModal] = useState<{
    id: string;
    nom: string;
    type: "user" | "client";
  } | null>(null);
  const [motif, setMotif] = useState("");

  const navigate = (params: URLSearchParams) =>
    router.push(`?${params.toString()}`);

  const changeType = (newType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", newType);
    params.delete("page");
    navigate(params);
  };

  const handleSuspendre = () => {
    if (!motifModal || motif.trim().length < 5) return;
    startTransition(async () => {
      if (motifModal.type === "user")
        await suspendreUserAction(motifModal.id, motif);
      else await suspendreClientAction(motifModal.id, motif);
      setMotifModal(null);
      setMotif("");
    });
  };

  const handleReactiver = (id: string, t: "user" | "client") => {
    startTransition(async () => {
      if (t === "user") await reactiverUserAction(id);
      else await reactiverClientAction(id);
    });
  };

  const isClient = type === "clients";

  return (
    <div className="space-y-5">
      {/* Tabs + Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl w-fit">
          {[
            { value: "restaurateurs", label: "Restaurateurs", icon: UserCheck },
            { value: "clients", label: "Clients", icon: Users },
          ].map((tab) => {
            const isActive = type === tab.value;
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => changeType(tab.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            defaultValue={search ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const params = new URLSearchParams(searchParams.toString());
                e.currentTarget.value
                  ? params.set("search", e.currentTarget.value)
                  : params.delete("search");
                params.delete("page");
                navigate(params);
              }
            }}
            placeholder="Rechercher par nom ou email..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                Contact
              </th>
              {isClient && (
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                  Total dépensé
                </th>
              )}
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Statut
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                Inscrit le
              </th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.items.map((item) => {
              const suspendu = isClient ? !item.actif : item.suspendu;
              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <CustomAvatar
                        fallbackText={item.nom}
                        alt={item.nom}
                        size="sm"
                        className="shrink-0"
                        fallbackClassName={cn(
                          "font-semibold",
                          suspendu
                            ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-700",
                        )}
                      />
                      <span className="font-semibold text-gray-900">
                        {item.nom}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-gray-700">{item.telephone}</p>
                    {item.email && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.email}
                      </p>
                    )}
                  </td>
                  {isClient && (
                    <td className="px-5 py-4 hidden lg:table-cell font-semibold text-gray-900">
                      {formatPrix(item.totalDepense ?? 0)}
                    </td>
                  )}
                  <td className="px-5 py-4">
                    {suspendu ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                        <UserX className="w-3 h-3" /> Suspendu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <UserCheck className="w-3 h-3" /> Actif
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs hidden sm:table-cell">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {suspendu ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          handleReactiver(item.id, isClient ? "client" : "user")
                        }
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        Réactiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setMotifModal({
                            id: item.id,
                            nom: item.nom,
                            type: isClient ? "client" : "user",
                          })
                        }
                        className="text-xs font-semibold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        Suspendre
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">
              Aucun utilisateur trouvé
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Essayez de modifier votre recherche
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-800">{data.total}</span>{" "}
            résultats · page{" "}
            <span className="font-medium text-gray-800">{data.page}</span> /{" "}
            {data.totalPages}
          </p>
          <div className="flex gap-1.5">
            {data.page > 1 && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(data.page - 1));
                  navigate(params);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
            )}
            {data.page < data.totalPages && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(data.page + 1));
                  navigate(params);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal suspension */}
      {motifModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Suspendre ce compte
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {motifModal.nom}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMotifModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Ce compte sera immédiatement suspendu. Un motif est obligatoire.
            </p>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif de la suspension (minimum 5 caractères)..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                disabled={isPending || motif.trim().length < 5}
                onClick={handleSuspendre}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {isPending ? "En cours..." : "Confirmer la suspension"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMotifModal(null);
                  setMotif("");
                }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
