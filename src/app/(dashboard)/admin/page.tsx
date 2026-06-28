import { getAdminSession } from "@/lib/auth/get-admin-session";
import {
  getEvolutionPlateformeAdmin,
  getStatsGlobalAdmin,
} from "@/lib/db/queries-admin";
import { formatPrix } from "@/lib/utils/format";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();

  // Fetch health + stats en parallèle
  const [stats, evolution, healthRes] = await Promise.all([
    getStatsGlobalAdmin(),
    getEvolutionPlateformeAdmin(14),
    fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/health`,
      {
        cache: "no-store",
      },
    )
      .then((r) => r.json())
      .catch(() => null) as Promise<{
      status: "healthy" | "degraded" | "unhealthy";
      version: string;
      services: {
        database: { status: "up" | "down"; latency?: number };
        cache: { status: "up" | "down"; latency?: number };
      };
    } | null>,
  ]);

  const prenom = admin.nom.split(" ")[0];

  // Calcul date actuelle en français
  const maintenant = new Date();
  const dateLabel = maintenant.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-6 lg:p-8 bg-[#FAFAFA] min-h-full">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ─── Colonne principale ─── */}
        <div className="xl:col-span-2 space-y-6">
          {/* En-tête */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Bonjour, {prenom} 👋
            </h2>
            <p className="text-sm text-gray-500 mt-1 capitalize">{dateLabel}</p>
          </div>

          {/* Alerte restaurants en attente */}
          {stats.restaurants.enAttente > 0 && (
            <Link
              href="/admin/restaurants?statut=en_attente"
              className="group flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {stats.restaurants.enAttente} restaurant
                    {stats.restaurants.enAttente > 1 ? "s" : ""} en attente de
                    validation
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Action requise — examiner et valider les nouveaux
                    partenaires.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          )}

          {/* KPIs principaux */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Restaurants actifs",
                value: stats.restaurants.actifs,
                icon: Store,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                href: "/admin/restaurants",
              },
              {
                label: "Utilisateurs",
                value: stats.usersTotal,
                icon: Users,
                color: "text-blue-600",
                bg: "bg-blue-50",
                href: "/admin/users",
              },
              {
                label: "Clients",
                value: stats.clientsTotal,
                icon: ShoppingBag,
                color: "text-purple-600",
                bg: "bg-purple-50",
                href: "/admin/users",
              },
              {
                label: "Commandes aujourd'hui",
                value: stats.commandesAujourdhui,
                icon: Clock,
                color: "text-orange-600",
                bg: "bg-orange-50",
                href: "/admin/commandes",
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Link
                  key={kpi.label}
                  href={kpi.href}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
                >
                  <div
                    className={`inline-flex p-2 rounded-xl ${kpi.bg} ${kpi.color} mb-3`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {kpi.value.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1">
                    {kpi.label}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </p>
                </Link>
              );
            })}
          </div>

          {/* GMV + Commissions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Volume transactionnel */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2.5 bg-emerald-50 text-emerald-600 rounded-xl`}
                >
                  <TrendingUp className="w-5 h-5" />
                </div>
                {stats.croissanceGmv !== null && (
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                      stats.croissanceGmv >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {stats.croissanceGmv >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(stats.croissanceGmv)}%
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Volume transactionnel (ce mois)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrix(stats.gmvMois)}
              </p>
              <p className="text-xs text-gray-400 mt-1">vs mois précédent</p>
            </div>

            {/* Commissions en attente */}
            <Link
              href="/admin/commissions"
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Voir le détail <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Commissions en attente
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrix(stats.commissionsEnAttente)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                à reverser aux partenaires
              </p>
            </Link>
          </div>

          {/* Graphique évolution des commandes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-gray-900">
                Activité de la plateforme
              </h3>
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                14 derniers jours
              </span>
            </div>

            <div className="flex items-end gap-1.5 h-44 w-full">
              {evolution.map((point) => {
                const max = Math.max(
                  ...evolution.map((p) => Number(p.count)),
                  1,
                );
                const heightPct = (Number(point.count) / max) * 100;
                const dayLabel = point.jour.split("-")[2] || point.jour;

                return (
                  <div
                    key={point.jour}
                    className="group relative flex-1 flex flex-col items-center gap-2 h-full justify-end"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-10 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                      {point.count} commande{Number(point.count) > 1 ? "s" : ""}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                    </div>

                    {/* Barre */}
                    <div
                      className="w-full bg-emerald-100 group-hover:bg-emerald-500 rounded-t-md transition-colors duration-200"
                      style={{ height: `${heightPct}%`, minHeight: "4px" }}
                    />

                    {/* Etiquette */}
                    <span className="text-[10px] font-medium text-gray-400 hidden sm:block">
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Colonne droite ─── */}
        <div className="space-y-6">
          {/* Récapitulatif statut des restaurants */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-5">
              Statut des restaurants
            </h3>
            <div className="space-y-4">
              {[
                {
                  label: "Actifs",
                  value: stats.restaurants.actifs,
                  color: "bg-emerald-500",
                  icon: CheckCircle2,
                  textColor: "text-emerald-700",
                  href: "/admin/restaurants?statut=actif",
                },
                {
                  label: "En attente",
                  value: stats.restaurants.enAttente,
                  color: "bg-amber-400",
                  icon: Clock,
                  textColor: "text-amber-700",
                  href: "/admin/restaurants?statut=en_attente",
                },
                {
                  label: "Suspendus",
                  value: stats.restaurants.suspendus ?? 0,
                  color: "bg-red-400",
                  icon: AlertTriangle,
                  textColor: "text-red-700",
                  href: "/admin/restaurants?statut=suspendu",
                },
              ].map((item) => {
                const Icon = item.icon;
                const total =
                  stats.restaurants.actifs +
                  stats.restaurants.enAttente +
                  (stats.restaurants.suspendus ?? 0);
                const pct =
                  total > 0 ? Math.round((item.value / total) * 100) : 0;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg ${item.color} bg-opacity-10`}
                    >
                      <Icon className={`w-4 h-4 ${item.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {item.label}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {item.value}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Commissions à encaisser */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-5">Finances</h3>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 mb-4 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <BadgeDollarSign className="w-4 h-4 opacity-80" />
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Commissions en attente
                  </span>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {formatPrix(stats.commissionsEnAttente)}
                </p>
                <p className="text-xs opacity-70 mb-4">
                  à reverser aux partenaires
                </p>
                <Link
                  href="/admin/commissions"
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Gérer les commissions <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute -right-2 -bottom-8 w-32 h-32 bg-white/5 rounded-full" />
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  Volume ce mois
                </span>
                {stats.croissanceGmv !== null && (
                  <span
                    className={`text-xs font-semibold flex items-center gap-0.5 ${
                      stats.croissanceGmv >= 0
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {stats.croissanceGmv >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(stats.croissanceGmv)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatPrix(stats.gmvMois)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">vs mois précédent</p>
            </div>
          </div>

          {/* Widget santé plateforme */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-600" />
                <h3 className="font-bold text-gray-900">
                  Santé de la plateforme
                </h3>
              </div>
              {healthRes ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    healthRes.status === "healthy"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : healthRes.status === "degraded"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-red-50 text-red-700 border-red-100"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      healthRes.status === "healthy"
                        ? "bg-emerald-500"
                        : healthRes.status === "degraded"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  {healthRes.status === "healthy"
                    ? "Opérationnel"
                    : healthRes.status === "degraded"
                      ? "Dégradé"
                      : "Hors ligne"}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Indisponible</span>
              )}
            </div>

            {healthRes ? (
              <div className="space-y-3">
                {/* Base de données */}
                <div
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    healthRes.services.database.status === "up"
                      ? "bg-emerald-50/50 border-emerald-100"
                      : "bg-red-50/50 border-red-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        healthRes.services.database.status === "up"
                          ? "bg-emerald-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Database
                        className={`w-4 h-4 ${
                          healthRes.services.database.status === "up"
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Base de données
                      </p>
                      <p className="text-xs text-gray-500">PostgreSQL</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xs font-bold ${
                        healthRes.services.database.status === "up"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {healthRes.services.database.status === "up"
                        ? "En ligne"
                        : "Hors ligne"}
                    </p>
                    {healthRes.services.database.latency !== undefined && (
                      <p className="text-xs text-gray-400">
                        {healthRes.services.database.latency} ms
                      </p>
                    )}
                  </div>
                </div>

                {/* Cache Redis */}
                <div
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    healthRes.services.cache.status === "up"
                      ? "bg-emerald-50/50 border-emerald-100"
                      : "bg-amber-50/50 border-amber-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        healthRes.services.cache.status === "up"
                          ? "bg-emerald-100"
                          : "bg-amber-100"
                      }`}
                    >
                      <Cpu
                        className={`w-4 h-4 ${
                          healthRes.services.cache.status === "up"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Cache
                      </p>
                      <p className="text-xs text-gray-500">Redis</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xs font-bold ${
                        healthRes.services.cache.status === "up"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {healthRes.services.cache.status === "up"
                        ? "En ligne"
                        : "Hors ligne"}
                    </p>
                    {healthRes.services.cache.latency !== undefined && (
                      <p className="text-xs text-gray-400">
                        {healthRes.services.cache.latency} ms
                      </p>
                    )}
                  </div>
                </div>

                {/* Version déployée */}
                {healthRes.version && (
                  <div className="flex items-center justify-between px-1 pt-1">
                    <span className="text-xs text-gray-400">
                      Version déployée
                    </span>
                    <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {healthRes.version}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <WifiOff className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">
                  Impossible de joindre le service de santé
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
