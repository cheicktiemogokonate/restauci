import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate, formatPrix } from "@/lib/utils/format";
import type { RecentOrdersProps } from "@/types/dashboard";
import Link from "next/link";

const statusStyles: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  en_preparation: "bg-blue-100 text-blue-800 border-blue-200",
  pret: "bg-indigo-100 text-indigo-800 border-indigo-200",
  en_livraison: "bg-purple-100 text-purple-800 border-purple-200",
  livre: "bg-emerald-100 text-emerald-800 border-emerald-200",
  termine: "bg-emerald-100 text-emerald-800 border-emerald-200",
  annule: "bg-red-100 text-red-800 border-red-200",
};

export function RecentOrders({ commandes }: RecentOrdersProps) {
  if (!commandes || commandes.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Commandes récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune commande récente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">
          Commandes récentes
        </CardTitle>
        <Link
          href="/restaurateur/commandes"
          className="text-sm font-medium text-brand-green hover:underline"
        >
          Voir tout
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">N° Commande</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Total</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-sm">
                    <Link
                      href={`/restaurateur/commandes/${order.id}`}
                      className="hover:underline"
                    >
                      {order.numero.startsWith("#")
                        ? order.numero
                        : `#${order.numero}`}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt || new Date())}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {order.type}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {formatPrix(order.total)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.clientNom || "Client Inconnu"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        statusStyles[order.statut] ||
                          "bg-gray-100 text-gray-800",
                      )}
                    >
                      {order.statutLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
