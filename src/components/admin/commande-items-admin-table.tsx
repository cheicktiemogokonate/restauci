"use client";

import { Table, type TableColumn } from "@/components/motion/table";
import { formatPrix } from "@/lib/utils/format";

interface CommandeItemRow {
  platId: string;
  nom: string;
  prix: number;
  quantite: number;
}

export function CommandeItemsAdminTable({
  items,
  total,
}: {
  items: CommandeItemRow[];
  total: number;
}) {
  const columns: TableColumn<CommandeItemRow>[] = [
    {
      key: "nom",
      header: "Article",
      sortable: true,
      width: "280px",
      cell: (item) => <span className="font-medium">{item.nom}</span>,
    },
    {
      key: "prix",
      header: "Prix unitaire",
      sortable: true,
      width: "150px",
      align: "right",
      cell: (item) => formatPrix(item.prix),
    },
    {
      key: "quantite",
      header: "Quantité",
      sortable: true,
      width: "120px",
      align: "right",
      cell: (item) => `× ${item.quantite}`,
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      width: "150px",
      align: "right",
      sortValue: (item) => item.prix * item.quantite,
      cell: (item) => (
        <span className="font-semibold">
          {formatPrix(item.prix * item.quantite)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Table
        data={items}
        columns={columns}
        getRowId={(item, index) => `${item.platId}-${index}`}
        resizable
        reorderable
        rowHeight={60}
        height={Math.min(Math.max(items.length * 60 + 48, 160), 420)}
      />
      <div className="flex justify-end border-t bg-gray-50/50 px-5 py-4">
        <span className="mr-6 font-semibold text-gray-700">
          Total de la commande
        </span>
        <span className="text-lg font-bold text-gray-900">
          {formatPrix(total)}
        </span>
      </div>
    </div>
  );
}
