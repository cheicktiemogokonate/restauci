"use client";

import { CommissionPaymentButton } from "@/components/admin/commission-payment-button";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Table, type TableColumn } from "@/components/motion/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrix } from "@/lib/utils/format";
import {
  ArrowRight,
  BadgeDollarSign,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface RestaurantCommissionRow {
  restaurantId: string;
  restaurantNom: string;
  nombreCommandes: number;
  montantDu: number | string;
}

interface CommissionRow {
  id: string;
  restaurantId: string;
  restaurantNom: string;
  commandeId: string;
  statut: string;
  montantCommission: number | string;
  createdAt: Date | string;
}

export function RestaurantSummaryTable({
  rows,
  maxMontant,
  totalDu,
}: {
  rows: RestaurantCommissionRow[];
  maxMontant: number;
  totalDu: number;
}) {
  const columns: TableColumn<RestaurantCommissionRow>[] = [
    {
      key: "restaurantNom",
      header: "Restaurant",
      sortable: true,
      width: "220px",
      cell: (restaurant) => (
        <Link
          href={`/admin/restaurants/${restaurant.restaurantId}`}
          className="font-medium hover:text-primary"
        >
          {restaurant.restaurantNom}
        </Link>
      ),
    },
    {
      key: "nombreCommandes",
      header: "Commandes",
      sortable: true,
      width: "120px",
    },
    {
      key: "montantDu",
      header: "Montant dû",
      sortable: true,
      width: "150px",
      sortValue: (restaurant) => Number(restaurant.montantDu),
      cell: (restaurant) => (
        <span className="font-semibold">
          {formatPrix(Number(restaurant.montantDu))}
        </span>
      ),
    },
    {
      key: "proportion",
      header: "Proportion",
      width: "220px",
      cell: (restaurant) => {
        const percentage = Math.round(
          (Number(restaurant.montantDu) / maxMontant) * 100,
        );
        return (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${percentage}%` }}
            />
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "260px",
      align: "right",
      cell: (restaurant) => (
        <div className="inline-flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/restaurants/${restaurant.restaurantId}`}>
              Voir <ArrowRight />
            </Link>
          </Button>
          <CommissionPaymentButton
            restaurantId={restaurant.restaurantId}
            restaurantNom={restaurant.restaurantNom}
            montantFormate={formatPrix(Number(restaurant.montantDu))}
          />
        </div>
      ),
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold">Détail par restaurant</h2>
        <StatusBadge variant="warning">{rows.length} restaurants</StatusBadge>
      </div>
      <Table
        data={rows}
        columns={columns}
        getRowId={(restaurant) => restaurant.restaurantId}
        defaultSort={{ key: "montantDu", direction: "desc" }}
        resizable
        reorderable
        rowHeight={68}
        height={Math.min(Math.max(rows.length * 68 + 48, 180), 520)}
        emptyState={
          <EmptyState
            icon={<BadgeDollarSign className="size-7" />}
            title="Aucune commission trouvée"
            description="Aucun montant n’est actuellement en attente."
          />
        }
      />
      <div className="flex items-center justify-between border-t bg-muted/30 px-5 py-4">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="size-4" />
          Total à encaisser
        </span>
        <span className="text-lg font-semibold">{formatPrix(totalDu)}</span>
      </div>
    </section>
  );
}

export function CommissionDetailsTable({
  rows,
  total,
}: {
  rows: CommissionRow[];
  total: number;
}) {
  const columns: TableColumn<CommissionRow>[] = [
    {
      key: "restaurantNom",
      header: "Restaurant",
      sortable: true,
      width: "220px",
      cell: (commission) => (
        <Link
          href={`/admin/restaurants/${commission.restaurantId}`}
          className="font-medium hover:text-primary"
        >
          {commission.restaurantNom}
        </Link>
      ),
    },
    {
      key: "commandeId",
      header: "Commande",
      sortable: true,
      width: "140px",
      cell: (commission) => (
        <Link
          href={`/admin/commandes/${commission.commandeId}`}
          className="font-mono text-xs font-medium text-primary hover:underline"
        >
          {commission.commandeId.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      width: "130px",
      cell: (commission) => (
        <StatusBadge
          variant={
            commission.statut === "payee"
              ? "success"
              : commission.statut === "annulee"
                ? "neutral"
                : "warning"
          }
        >
          {commission.statut === "en_attente"
            ? "En attente"
            : commission.statut === "payee"
              ? "Payée"
              : "Annulée"}
        </StatusBadge>
      ),
    },
    {
      key: "montantCommission",
      header: "Commission",
      sortable: true,
      width: "150px",
      align: "right",
      sortValue: (commission) => Number(commission.montantCommission),
      cell: (commission) => (
        <span className="font-semibold">
          {formatPrix(Number(commission.montantCommission))}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      width: "150px",
      align: "right",
      sortValue: (commission) => new Date(commission.createdAt).getTime(),
      cell: (commission) => (
        <span className="text-muted-foreground">
          {formatDate(commission.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold">Détail des commissions</h2>
        <span className="text-sm text-muted-foreground">
          {total} résultat{total > 1 ? "s" : ""}
        </span>
      </div>
      <Table
        data={rows}
        columns={columns}
        getRowId={(commission) => commission.id}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        resizable
        reorderable
        rowHeight={64}
        height={Math.min(Math.max(rows.length * 64 + 48, 180), 520)}
        emptyState={
          <EmptyState
            icon={<BadgeDollarSign className="size-7" />}
            title="Aucune commission trouvée"
            description="Modifiez vos filtres pour élargir la recherche."
          />
        }
      />
    </section>
  );
}
