"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Table, type TableColumn } from "@/components/motion/table";
import { formatPrix } from "@/lib/utils/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { History } from "lucide-react";

interface SubscriptionPeriodRow {
  id: string;
  restaurantNom: string;
  planCode: string;
  statut: string;
  dateDebut: Date;
  dateEcheance: Date | null;
  prixPayeFcfa: number;
}

export function SubscriptionHistoryTable({
  periods,
}: {
  periods: SubscriptionPeriodRow[];
}) {
  const columns: TableColumn<SubscriptionPeriodRow>[] = [
    {
      key: "restaurantNom",
      header: "Restaurant",
      sortable: true,
      width: "220px",
      cell: (period) => (
        <span className="font-medium">{period.restaurantNom}</span>
      ),
    },
    {
      key: "planCode",
      header: "Offre",
      sortable: true,
      width: "160px",
      cell: (period) => (
        <span className="capitalize">{period.planCode.replace("_", " ")}</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      width: "120px",
      cell: (period) => (
        <StatusBadge
          variant={period.statut === "active" ? "success" : "neutral"}
        >
          {period.statut}
        </StatusBadge>
      ),
    },
    {
      key: "dateDebut",
      header: "Date de début",
      sortable: true,
      width: "150px",
      sortValue: (period) => new Date(period.dateDebut).getTime(),
      cell: (period) =>
        format(new Date(period.dateDebut), "dd MMM yyyy", { locale: fr }),
    },
    {
      key: "dateEcheance",
      header: "Échéance",
      sortable: true,
      width: "150px",
      sortValue: (period) =>
        period.dateEcheance ? new Date(period.dateEcheance).getTime() : 0,
      cell: (period) =>
        period.dateEcheance
          ? format(new Date(period.dateEcheance), "dd MMM yyyy", { locale: fr })
          : "—",
    },
    {
      key: "prixPayeFcfa",
      header: "Payé",
      sortable: true,
      width: "140px",
      align: "right",
      cell: (period) => formatPrix(period.prixPayeFcfa),
    },
  ];

  return (
    <Table
      data={periods}
      columns={columns}
      getRowId={(period) => period.id}
      defaultSort={{ key: "dateDebut", direction: "desc" }}
      resizable
      reorderable
      rowHeight={64}
      height={Math.min(Math.max(periods.length * 64 + 48, 180), 520)}
      emptyState={
        <EmptyState
          icon={<History className="size-7" />}
          title="Aucun historique"
          description="Les périodes récentes apparaîtront ici."
        />
      }
    />
  );
}
