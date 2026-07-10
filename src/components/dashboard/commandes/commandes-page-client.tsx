"use client";

import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useCommandesStream } from "@/hooks/use-commandes-stream";
import type { Commande } from "@/types";
import { parseISO, format } from "date-fns";
import { SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  commandeToOrder,
  getNextStatutOnCheckout,
  getOrderFilterCounts,
  matchesOrderFilter,
} from "./map-commande-to-order";
import { OrderCard, type Order } from "./order-card";
import { OrderFilters } from "./order-filters";

// Son de notification double-bip via Web Audio API
const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx() as AudioContext;

    const beep = (startTime: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    };

    beep(ctx.currentTime);
    beep(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn("[Audio] Impossible de jouer le son de notification :", e);
  }
};

interface CommandesPageClientProps {
  initialCommandes: Commande[];
  restaurantId: string;
  selectedDateStr: string;
}

// Note: Ce composant reçoit un `key` dans le parent (page.tsx) basé sur
// `selectedDateStr`, ce qui le force à se remonter proprement lors d'un
// changement de date — pas besoin de synchroniser initialCommandes via useEffect.
export default function CommandesPageClient({
  initialCommandes,
  restaurantId,
  selectedDateStr,
}: CommandesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [commandes, setCommandes] = useState<Commande[]>(initialCommandes);
  const [activeFilter, setActiveFilter] = useState("all");
  const currentPage = Number(searchParams.get("page")) || 1;
  const itemsPerPage = 6;
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const selectedDate = useMemo(() => parseISO(selectedDateStr), [selectedDateStr]);

  // Gestionnaire d'événements SSE — ajoute les nouvelles commandes en temps réel
  const handleSseEvent = (type: string, data: unknown) => {
    if (type === "nouvelle_commande" && data && typeof data === "object") {
      const commande = data as Commande;
      playNotificationSound();
      setCommandes((prev) => {
        const exists = prev.some((c) => c.id === commande.id);
        if (exists) return prev.map((c) => (c.id === commande.id ? commande : c));
        return [commande, ...prev];
      });
    }
  };

  // Toujours actif — le stream écoute en permanence les nouvelles commandes
  const { isConnected } = useCommandesStream(restaurantId, handleSseEvent);

  const counts = useMemo(() => getOrderFilterCounts(commandes), [commandes]);

  const filteredCommandes = useMemo(
    () => commandes.filter((c) => matchesOrderFilter(c, activeFilter)),
    [commandes, activeFilter],
  );

  const paginatedOrders: Order[] = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCommandes
      .slice(start, start + itemsPerPage)
      .map(commandeToOrder);
  }, [filteredCommandes, currentPage, itemsPerPage]);

  const updateStatut = async (
    commandeId: string,
    statut: Commande["statut"],
  ) => {
    setUpdatingId(commandeId);
    try {
      const res = await fetch(`/api/commandes/${commandeId}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) return;
      const responseData = (await res.json()) as { commande: Commande };
      setCommandes((prev) =>
        prev.map((c) => (c.id === responseData.commande.id ? responseData.commande : c)),
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

  const handleDateChange = (date?: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", format(date, "yyyy-MM-dd"));
    } else {
      params.delete("date");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-full flex-1 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <OrderFilters
            activeFilter={activeFilter}
            onFilterChange={(filter) => {
              setActiveFilter(filter);
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", "1");
              router.push(`?${params.toString()}`);
            }}
            counts={counts}
          />
          <div className="flex items-center gap-2">
            {/* Indicateur de connexion temps réel */}
            <span
              title={isConnected ? "Temps réel actif" : "Hors ligne — reconnexion..."}
              className={`inline-block h-2 w-2 rounded-full transition-colors ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-400"
              }`}
            />
            <DatePicker date={selectedDate} setDate={handleDateChange} />
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
            </Button>
          </div>
        </div>

        {paginatedOrders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Aucune commande pour ce filtre à cette date.
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
          <Pagination
            total={filteredCommandes.length}
            page={currentPage}
            limit={itemsPerPage}
          />
        )}
      </main>
    </div>
  );
}
