"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Table, type TableColumn } from "@/components/motion/table";
import { formatPrix } from "@/shared/format";
import type { AdminFinancialJournalEntryDTO } from "@/modules/transactions/contracts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReceiptText } from "lucide-react";

const transactionLabels: Record<
  AdminFinancialJournalEntryDTO["transactionType"],
  string
> = {
  commande_restaurant: "Commande Restaurant",
  abonnement_partenaire: "Abonnement partenaire",
  commission_settlement: "Règlement de commission",
  reservation_residence: "Réservation Résidence",
  remboursement: "Remboursement",
};

const methodLabels: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  card: "Carte",
  bank_transfer: "Virement",
  cheque: "Chèque",
  manual: "Manuel",
};

function shortId(value: string) {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export function FinancialJournalTable({
  entries,
}: {
  entries: AdminFinancialJournalEntryDTO[];
}) {
  const columns: TableColumn<AdminFinancialJournalEntryDTO>[] = [
    {
      key: "occurredAt",
      header: "Date",
      sortable: true,
      width: "175px",
      sortValue: (entry) => new Date(entry.occurredAt).getTime(),
      cell: (entry) =>
        format(new Date(entry.occurredAt), "dd MMM yyyy, HH:mm", {
          locale: fr,
        }),
    },
    {
      key: "partnerName",
      header: "Compte",
      sortable: true,
      width: "240px",
      cell: (entry) => (
        <div>
          <span className="block font-medium">{entry.partnerName}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {shortId(entry.partnerAccountId)} · {entry.activityType}
          </span>
        </div>
      ),
    },
    {
      key: "amountFcfa",
      header: "Montant",
      sortable: true,
      width: "150px",
      align: "right",
      cell: (entry) => (
        <span className={entry.direction === "outflow" ? "text-amber-700" : ""}>
          {entry.direction === "outflow" ? "− " : "+ "}
          {formatPrix(entry.amountFcfa)}
        </span>
      ),
    },
    {
      key: "channel",
      header: "Canal et moyen",
      sortable: true,
      width: "180px",
      cell: (entry) => (
        <div>
          <StatusBadge variant={entry.channel === "provider" ? "info" : "neutral"}>
            {entry.channel === "provider"
              ? "En ligne"
              : entry.channel === "offline"
                ? "Hors ligne"
                : "Interne"}
          </StatusBadge>
          <span className="mt-1 block text-xs text-muted-foreground">
            {entry.method ? methodLabels[entry.method] : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Fournisseur / référence",
      width: "240px",
      cell: (entry) => (
        <div>
          <span className="block">{entry.provider ?? "Aucun fournisseur"}</span>
          <span className="block break-all font-mono text-xs text-muted-foreground">
            {entry.reference ?? "Aucune référence"}
          </span>
        </div>
      ),
    },
    {
      key: "transactionType",
      header: "Source",
      sortable: true,
      width: "240px",
      cell: (entry) => (
        <div>
          <span className="block">{transactionLabels[entry.transactionType]}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {shortId(entry.sourceId)}
          </span>
        </div>
      ),
    },
    {
      key: "entitlement",
      header: "Droit créé",
      width: "220px",
      cell: (entry) =>
        entry.entitlement ? (
          <div>
            <span className="block capitalize">
              Offre {entry.entitlement.planCode.replaceAll("_", " ")}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {shortId(entry.entitlement.id)}
            </span>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <Table
      data={entries}
      columns={columns}
      getRowId={(entry) => entry.id}
      defaultSort={{ key: "occurredAt", direction: "desc" }}
      resizable
      reorderable
      rowHeight={72}
      height={Math.min(Math.max(entries.length * 72 + 48, 220), 620)}
      emptyState={
        <EmptyState
          icon={<ReceiptText className="size-7" />}
          title="Aucun événement financier journalisé"
          description="Les confirmations et obligations créées depuis la Phase 6 apparaîtront ici."
        />
      }
    />
  );
}
