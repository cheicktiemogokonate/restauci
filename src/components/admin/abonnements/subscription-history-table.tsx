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
  partnerNom: string;
  activityType: "restaurant" | "residence";
  planCode: string;
  planNom: string;
  statut: string;
  dateDebut: Date;
  dateEcheance: Date | null;
  prixPayeFcfa: number;
  endedAt: Date | null;
  endReason: string | null;
}

export function SubscriptionHistoryTable({
  periods,
}: {
  periods: SubscriptionPeriodRow[];
}) {
  const columns: TableColumn<SubscriptionPeriodRow>[] = [
    {
      key: "partnerNom",
      header: "Partenaire",
      sortable: true,
      width: "220px",
      cell: (period) => (
        <div>
          <span className="block font-medium">{period.partnerNom}</span>
          <span className="text-xs capitalize text-muted-foreground">
            {period.activityType}
          </span>
        </div>
      ),
    },
    {
      key: "planNom",
      header: "Offre",
      sortable: true,
      width: "160px",
      cell: (period) => <span>{period.planNom}</span>,
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
      key: "endedAt",
      header: "Fin réelle",
      sortable: true,
      width: "150px",
      sortValue: (period) => period.endedAt ? new Date(period.endedAt).getTime() : 0,
      cell: (period) => period.endedAt
        ? format(new Date(period.endedAt), "dd MMM yyyy", { locale: fr })
        : "—",
    },
    {
      key: "endReason",
      header: "Raison de fin",
      sortable: true,
      width: "170px",
      cell: (period) => period.endReason
        ? period.endReason.replaceAll("_", " ")
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
