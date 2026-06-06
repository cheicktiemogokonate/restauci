"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/dashboard/header";
import { OrderFilters } from "./order-filters";
import { OrderCard, type Order } from "./order-card";
import { OrderPagination } from "./order-pagination";
import type { Commande } from "@/types";
import { useCommandesStream } from "@/hooks/useCommandesStream";
import {
  commandeToOrder,
  getNextStatutOnCheckout,
  getOrderFilterCounts,
  matchesOrderFilter,
} from "./map-commande-to-order";

interface CommandesPageClientProps {
  initialCommandes: Commande[];
  restaurantId: string;
}

export default function CommandesPageClient({
  initialCommandes,
  restaurantId,
}: CommandesPageClientProps) {
  const router = useRouter();
  const [commandes, setCommandes] = useState<Commande[]>(initialCommandes);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleNewCommande = useCallback((commande: Commande) => {
    setCommandes((prev) => {
      const exists = prev.some((c) => c.id === commande.id);
      if (exists) {
        return prev.map((c) => (c.id === commande.id ? commande : c));
      }
      return [commande, ...prev];
    });
  }, []);

  useCommandesStream(restaurantId, handleNewCommande);

  const counts = useMemo(() => getOrderFilterCounts(commandes), [commandes]);

  const filteredCommandes = useMemo(
    () => commandes.filter((c) => matchesOrderFilter(c, activeFilter)),
    [commandes, activeFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredCommandes.length / itemsPerPage));

  const paginatedOrders: Order[] = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCommandes
      .slice(start, start + itemsPerPage)
      .map(commandeToOrder);
  }, [filteredCommandes, currentPage, itemsPerPage]);

  const updateStatut = async (commandeId: string, statut: Commande["statut"]) => {
    setUpdatingId(commandeId);
    try {
      const res = await fetch(`/api/commandes/${commandeId}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { commande: Commande };
      setCommandes((prev) =>
        prev.map((c) => (c.id === data.commande.id ? data.commande : c))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewDetails = (order: Order) => {
    router.push(`/restaurateur/commandes/${order.id}`);
  };

  const handleCheckout = (order: Order) => {
    const commande = commandes.find((c) => c.id === order.id);
    if (!commande) return;
    const nextStatut = getNextStatutOnCheckout(commande.statut);
    if (!nextStatut || updatingId === order.id) return;
    void updateStatut(order.id, nextStatut);
  };

  return (
    <div className="flex flex-col min-h-full flex-1 overflow-hidden">
      <Header
        title="Commandes"
        breadcrumb={[
          { label: "Accueil", href: "/restaurateur" },
          { label: "Commandes clients" },
        ]}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <OrderFilters
            activeFilter={activeFilter}
            onFilterChange={(filter) => {
              setActiveFilter(filter);
              setCurrentPage(1);
            }}
            counts={counts}
          />
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
          </Button>
        </div>

        {paginatedOrders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Aucune commande pour ce filtre aujourd&apos;hui.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={handleViewDetails}
                onCheckout={handleCheckout}
              />
            ))}
          </div>
        )}

        {filteredCommandes.length > 0 && (
          <OrderPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCommandes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(count) => {
              setItemsPerPage(count);
              setCurrentPage(1);
            }}
          />
        )}
      </main>
    </div>
  );
}
