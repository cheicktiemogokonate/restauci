"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Table, type TableColumn } from "@/components/motion/table";
import { formatDate, formatHeure } from "@/lib/utils/format";
import { History } from "lucide-react";
import Link from "next/link";

interface AuditRow {
  id: string;
  adminId: string;
  adminNom: string;
  action: string;
  ressourceType: string;
  ressourceId: string;
  details: Record<string, unknown> | null;
  createdAt: Date | string;
}

const actionLabels: Record<string, string> = {
  restaurant_valide: "Restaurant validé",
  restaurant_rejete: "Restaurant refusé",
  restaurant_suspendu: "Restaurant suspendu",
  restaurant_reactive: "Restaurant réactivé",
  user_suspendu: "Compte suspendu",
  user_reactive: "Compte réactivé",
  client_suspendu: "Client suspendu",
  client_reactive: "Client réactivé",
  commission_modifiee: "Commission modifiée",
  commissions_encaissees: "Commissions encaissées",
  abonnement_valide: "Abonnement validé",
  abonnement_refuse: "Abonnement refusé",
  abonnement_suspendu: "Abonnement suspendu",
  abonnement_reactive: "Abonnement réactivé",
  abonnement_expire: "Abonnement expiré",
  abonnement_regrade: "Abonnement modifié",
  catalogue_modifie: "Catalogue modifié",
};

function resourceHref(row: AuditRow) {
  if (row.ressourceType === "restaurant") {
    return `/admin/restaurants/${row.ressourceId}`;
  }
  if (row.ressourceType === "commission") return "/admin/commissions";
  if (row.ressourceType === "user" || row.ressourceType === "client") {
    return "/admin/users";
  }
  return null;
}

function detailSummary(details: Record<string, unknown> | null) {
  if (!details) return "—";
  const preferred = [
    details.motif,
    details.motifRefus,
    details.planCode,
    details.action,
  ].find((value) => typeof value === "string");
  if (typeof preferred === "string") return preferred;
  return JSON.stringify(details);
}

export function AuditAdminTable({ rows }: { rows: AuditRow[] }) {
  const columns: TableColumn<AuditRow>[] = [
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      width: "170px",
      sortValue: (row) => new Date(row.createdAt).getTime(),
      cell: (row) => (
        <div>
          <p className="font-medium">{formatDate(row.createdAt)}</p>
          <p className="text-xs text-muted-foreground">
            {formatHeure(row.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: "adminNom",
      header: "Administrateur",
      sortable: true,
      width: "180px",
      cell: (row) => <span className="font-medium">{row.adminNom}</span>,
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      width: "220px",
      cell: (row) => (
        <StatusBadge
          variant={
            row.action.includes("suspendu") ||
            row.action.includes("rejete") ||
            row.action.includes("refuse")
              ? "warning"
              : "success"
          }
        >
          {actionLabels[row.action] ?? row.action}
        </StatusBadge>
      ),
    },
    {
      key: "ressourceType",
      header: "Ressource",
      sortable: true,
      width: "160px",
      cell: (row) => {
        const href = resourceHref(row);
        const label = row.ressourceType.replaceAll("_", " ");
        return href ? (
          <Link
            href={href}
            className="font-medium capitalize text-emerald-700 hover:underline"
          >
            {label}
          </Link>
        ) : (
          <span className="capitalize">{label}</span>
        );
      },
    },
    {
      key: "ressourceId",
      header: "Identifiant",
      width: "230px",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.ressourceId}
        </span>
      ),
    },
    {
      key: "details",
      header: "Détail",
      width: "260px",
      cell: (row) => {
        const summary = detailSummary(row.details);
        return (
          <span className="text-sm text-muted-foreground" title={summary}>
            {summary}
          </span>
        );
      },
    },
  ];

  return (
    <Table
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      defaultSort={{ key: "createdAt", direction: "desc" }}
      resizable
      reorderable
      rowHeight={64}
      height={Math.min(Math.max(rows.length * 64 + 48, 300), 520)}
      className="rounded-xl bg-white"
      emptyState={
        <EmptyState
          icon={<History className="size-7" />}
          title="Aucune action trouvée"
          description="Modifiez les filtres pour élargir la recherche."
        />
      }
    />
  );
}
