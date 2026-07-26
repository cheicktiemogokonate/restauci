"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Table, type TableColumn } from "@/components/motion/table";
import { getCommandeStatusMeta } from "@/lib/config/commande-status";
import { formatDate, formatPrix } from "@/lib/utils/format";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

interface CommandeAdminRow {
  id: string;
  numero: string;
  restaurantId: string;
  restaurantNom: string;
  nomClient: string;
  statut: string;
  total: number;
  createdAt: Date | string;
}

export function CommandesAdminTable({
  items,
}: {
  items: CommandeAdminRow[];
}) {
  const columns: TableColumn<CommandeAdminRow>[] = [
    {
      key: "numero",
      header: "N° Commande",
      sortable: true,
      width: "150px",
      cell: (commande) => (
        <Link
          href={`/admin/commandes/${commande.id}`}
          className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
        >
          {commande.numero}
        </Link>
      ),
    },
    {
      key: "restaurantNom",
      header: "Restaurant",
      sortable: true,
      width: "220px",
      cell: (commande) => (
        <Link
          href={`/admin/restaurants/${commande.restaurantId}`}
          className="font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          {commande.restaurantNom}
        </Link>
      ),
    },
    {
      key: "nomClient",
      header: "Client",
      sortable: true,
      width: "180px",
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      width: "145px",
      cell: (commande) => {
        const meta = getCommandeStatusMeta(commande.statut);
        return (
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
            {meta.label}
          </StatusBadge>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      width: "130px",
      align: "right",
      cell: (commande) => (
        <span className="font-bold text-gray-900">
          {formatPrix(commande.total)}
        </span>
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
    <Table
      data={items}
      columns={columns}
      getRowId={(commande) => commande.id}
      defaultSort={{ key: "createdAt", direction: "desc" }}
      resizable
      reorderable
      rowHeight={64}
      height={Math.min(Math.max(items.length * 64 + 48, 180), 520)}
      className="rounded-xl bg-white"
      emptyState={
        <EmptyState
          icon={<ShoppingBag className="size-7" />}
          title="Aucune commande trouvée"
          description="Essayez de modifier vos filtres."
        />
      }
    />
  );
}
