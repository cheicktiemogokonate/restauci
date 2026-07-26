"use client";

import { useRealtimeContext } from "@/components/dashboard/layout/dashboard-realtime-provider";
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
import type { CommandeResume, RecentOrdersProps } from "@/types/dashboard";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusStyles: Record<string, string> = {
  recue: "bg-blue-50 text-blue-700 border-blue-200",
  en_preparation: "bg-amber-50 text-amber-700 border-amber-200",
  prete: "bg-emerald-50 text-emerald-700 border-emerald-200",
  servie: "bg-muted text-muted-foreground border-border",
  annulee: "bg-red-50 text-red-700 border-red-200",
};

export function RecentOrders({ commandes }: RecentOrdersProps) {
  const { latestEvent } = useRealtimeContext();
  const [recentCommandes, setRecentCommandes] = useState(commandes);

  useEffect(() => {
    if (!latestEvent) return;

    const data = latestEvent.data as Record<string, unknown>;

    if (latestEvent.type === "nouvelle_commande") {
      if (
        typeof data.id !== "string" ||
        typeof data.numero !== "string" ||
        typeof data.createdAt !== "string"
      ) {
        return;
      }

      const timer = window.setTimeout(() => {
        const incoming = {
          ...data,
          createdAt: new Date(data.createdAt as string),
          updatedAt: new Date(
            typeof data.updatedAt === "string" ? data.updatedAt : data.createdAt as string,
          ),
          clientNom:
            typeof data.nomClient === "string" ? data.nomClient : "Client",
          statutLabel:
            typeof data.statut === "string" ? data.statut : "recue",
          type:
            typeof data.modeCommande === "string" ? data.modeCommande : undefined,
        } as CommandeResume;

        setRecentCommandes((previous) =>
          [incoming, ...previous.filter((commande) => commande.id !== incoming.id)]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .slice(0, 5),
        );
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (
      latestEvent.type === "statut" &&
      typeof data.commandeId === "string" &&
      typeof data.statut === "string"
    ) {
      const timer = window.setTimeout(() => {
        setRecentCommandes((previous) =>
          previous.map((commande) =>
            commande.id === data.commandeId
              ? {
                  ...commande,
                  statut: data.statut as CommandeResume["statut"],
                  statutLabel: data.statut as string,
                }
              : commande,
          ),
        );
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [latestEvent]);

  if (!recentCommandes || recentCommandes.length === 0) {
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
        <div className="hidden overflow-x-auto md:block -mx-6 px-6">
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
              {recentCommandes.map((order) => (
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

        <div className="space-y-3 md:hidden">
          {recentCommandes.map((order) => (
            <Link
              key={order.id}
              href={`/restaurateur/commandes/${order.id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {order.numero.startsWith("#")
                      ? order.numero
                      : `#${order.numero}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt || new Date())} • {order.type}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] font-medium",
                    statusStyles[order.statut] || "bg-gray-100 text-gray-800",
                  )}
                >
                  {order.statutLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {order.clientNom || "Client Inconnu"}
                </span>
                <span className="font-semibold text-foreground">
                  {formatPrix(order.total)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
