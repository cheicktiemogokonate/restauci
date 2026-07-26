"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Input } from "@/components/motion/input";
import { Table, type TableColumn } from "@/components/motion/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { Button } from "@/components/ui/button";
import { getAdminRestaurantStatus } from "@/lib/config/admin-workflows";
import type { Restaurant } from "@/lib/db/types";
import { formatDate } from "@/lib/utils/format";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface RestaurantsAdminTableProps {
  items: (Pick<
    Restaurant,
    | "id"
    | "nom"
    | "slug"
    | "telephone"
    | "ville"
    | "actif"
    | "suspendu"
    | "motifRejet"
    | "enLigne"
    | "nombreCommandes"
    | "noteMoyenne"
    | "createdAt"
  > & {
    planCode: string | null;
    planNom: string | null;
    statutAbonnement: string | null;
    dateEcheance: Date | null;
    tauxCommissionBpsFige: number | null;
  })[];
  total: number;
  page: number;
  totalPages: number;
  counts?: {
    enAttente: number;
    actifs: number;
    suspendus: number;
    rejetes: number;
    total: number;
  };
  statutActif: string;
  search?: string;
}

const TABS = [
  { value: "tous", label: "Tous" },
  { value: "en_attente", label: "En attente" },
  { value: "actif", label: "Actifs" },
  { value: "suspendu", label: "Suspendus" },
  { value: "rejete", label: "Rejetés" },
];

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
    return <StatusBadge variant="danger">Suspendu</StatusBadge>;
  if (status === "actif")
    return <StatusBadge variant="success">Actif</StatusBadge>;
  if (status === "rejete")
    return <StatusBadge variant="neutral">Rejeté</StatusBadge>;
  return <StatusBadge variant="warning">En attente</StatusBadge>;
}

export function RestaurantsAdminTable({
  items,
  total,
  page,
  totalPages,
  counts,
  statutActif,
  search,
}: RestaurantsAdminTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search ?? "");

  const navigate = (params: URLSearchParams) =>
    router.push(`?${params.toString()}`);

  const changeTab = (statut: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statut === "tous") {
      params.delete("statut");
    } else {
      params.set("statut", statut);
    }
    params.delete("page");
    navigate(params);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }
    params.delete("page");
    navigate(params);
  };

  const getCount = (tab: string) => {
    if (!counts) return null;
    return (
      {
        tous: counts.total,
        en_attente: counts.enAttente,
        actif: counts.actifs,
        suspendu: counts.suspendus,
        rejete: counts.rejetes,
      }[tab] ?? null
    );
  };

  type RestaurantRow = RestaurantsAdminTableProps["items"][number];
  const columns: TableColumn<RestaurantRow>[] = [
    {
      key: "nom",
      header: "Restaurant",
      sortable: true,
      width: "260px",
      cell: (restaurant) => (
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200">
            <Store className="size-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/restaurants/${restaurant.id}`}
              className="block truncate font-semibold text-gray-900 transition-colors hover:text-emerald-700"
            >
              {restaurant.nom}
            </Link>
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {restaurant.telephone}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "ville",
      header: "Ville",
      sortable: true,
      width: "130px",
      cell: (restaurant) => restaurant.ville ?? "—",
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      width: "130px",
      sortValue: (restaurant) => getAdminRestaurantStatus(restaurant),
      cell: (restaurant) => (
        <StatutBadge
          actif={restaurant.actif}
          suspendu={restaurant.suspendu}
          motifRejet={restaurant.motifRejet}
        />
      ),
    },
    {
      key: "planNom",
      header: "Offre",
      sortable: true,
      width: "150px",
      cell: (restaurant) => restaurant.planNom ?? "—",
    },
    {
      key: "dateEcheance",
      header: "Échéance",
      sortable: true,
      width: "150px",
      sortValue: (restaurant) =>
        restaurant.dateEcheance
          ? new Date(restaurant.dateEcheance).getTime()
          : 0,
      cell: (restaurant) =>
        restaurant.dateEcheance
          ? formatDate(restaurant.dateEcheance)
          : "Sans échéance",
    },
    {
      key: "nombreCommandes",
      header: "Commandes",
      sortable: true,
      width: "120px",
      cell: (restaurant) => (
        <span className="inline-flex items-center gap-1.5">
          <ShoppingBag className="size-3.5 text-gray-400" />
          <span className="font-medium">{restaurant.nombreCommandes}</span>
        </span>
      ),
    },
    {
      key: "noteMoyenne",
      header: "Note",
      sortable: true,
      width: "100px",
      cell: (restaurant) =>
        restaurant.noteMoyenne ? (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <Star className="size-3.5 fill-amber-400 stroke-amber-400" />
            <span className="font-semibold text-gray-800">
              {restaurant.noteMoyenne}
            </span>
            <span className="text-gray-400">/5</span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "action",
      header: "Action",
      width: "100px",
      align: "right",
      cell: (restaurant) => (
        <Link
          href={`/admin/restaurants/${restaurant.id}`}
          className="inline-flex items-center gap-1 font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
        >
          Gérer <ChevronRight className="size-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs + Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <Tabs
          value={statutActif}
          onValueChange={changeTab}
          variant="underline"
          className="max-w-full overflow-x-auto scrollbar-hide"
        >
          <TabsList className="h-11 min-w-max gap-0">
            {TABS.map((tab) => {
              const count = getCount(tab.value);
              const isActive = statutActif === tab.value;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-11 gap-1.5 px-3.5 text-sm"
                  indicatorClassName="h-0.5 bg-emerald-600"
                >
                  {tab.label}
                  {count !== null && (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}
                    >
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Input
              type="text"
              aria-label="Rechercher un restaurant"
              value={searchValue}
              onChange={setSearchValue}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Rechercher un restaurant..."
              leftIcon={<Search />}
              className="w-full"
              classNames={{ field: "h-10 rounded-xl bg-white" }}
            />
          </div>
          <Button type="button" onClick={handleSearch} className="h-auto">
            Chercher
          </Button>
        </div>
      </div>

      <Table
        data={items}
        columns={columns}
        getRowId={(restaurant) => restaurant.id}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        resizable
        reorderable
        rowHeight={72}
        height={Math.min(Math.max(items.length * 72 + 48, 180), 520)}
        className="rounded-xl bg-white"
        emptyState={
          <EmptyState
            icon={<Store className="size-7" />}
            title="Aucun restaurant trouvé"
            description="Essayez de modifier vos filtres."
          />
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-800">{total}</span> résultats
            · page <span className="font-medium text-gray-800">{page}</span> /{" "}
            {totalPages}
          </p>
          <div className="flex gap-1.5">
            {page > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(page - 1));
                  navigate(params);
                }}
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </Button>
            )}
            {page < totalPages && (
              <Button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(page + 1));
                  navigate(params);
                }}
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
