"use client";

import { Pagination } from "@/components/dashboard/pagination";
import { useRealtimeContext } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import type { Commande } from "@/types";
import { format, isSameDay, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  commandeToOrder,
  getNextStatutOnCheckout,
  getOrderFilterCounts,
  sortCommandesForService,
} from "./map-commande-to-order";
import { OrderCard, type Order } from "./order-card";

type CommandesTab = "service" | "historique";
type HistoryStatusFilter = "all" | "servie" | "annulee";
type HistoryModeFilter = "all" | Commande["modeCommande"];

const SERVICE_SECTIONS = [
  {
    statut: "recue" as const,
    title: "Nouvelles commandes",
    description: "À accepter ou refuser en priorité.",
  },
  {
    statut: "en_preparation" as const,
    title: "En préparation",
    description: "À suivre jusqu'à ce qu'elles soient prêtes.",
  },
  {
    statut: "prete" as const,
    title: "Prêtes à remettre",
    description: "À encaisser ou à remettre au livreur.",
  },
];

interface CommandesPageClientProps {
  initialCommandes: Commande[];
  initialHistoryCommandes: Commande[];
  historyTotal: number;
  historyPage: number;
  historySearch: string;
  historyStatus: HistoryStatusFilter;
  historyMode: HistoryModeFilter;
  restaurantId: string;
  selectedDateStr: string;
  assignedDeliveryCommandeIds: string[];
}

export default function CommandesPageClient({
  initialCommandes,
  initialHistoryCommandes,
  historyTotal,
  historyPage,
  historySearch: initialHistorySearch,
  historyStatus,
  historyMode,
  selectedDateStr,
  assignedDeliveryCommandeIds,
}: CommandesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [updatedCommandes, setUpdatedCommandes] = useState(
    () => new Map<string, Commande>(),
  );
  const [pendingCommandeIds, setPendingCommandeIds] = useState(
    () => new Set<string>(),
  );
  const [realtimeCommandes, setRealtimeCommandes] = useState(
    () => new Map<string, Commande>(),
  );
  const [realtimeAssignedDeliveryIds, setRealtimeAssignedDeliveryIds] = useState(
    () => new Set<string>(),
  );
  const [activeTab, setActiveTab] = useState<CommandesTab>("service");
  const [tabDirection, setTabDirection] = useState(1);
  const [historySearch, setHistorySearch] = useState(initialHistorySearch);
  const itemsPerPage = 6;
  const reduceMotion = useReducedMotion();
  const { latestEvent } = useRealtimeContext();
  const assignedDeliveryIds = useMemo(
    () => new Set([...assignedDeliveryCommandeIds, ...realtimeAssignedDeliveryIds]),
    [assignedDeliveryCommandeIds, realtimeAssignedDeliveryIds],
  );

  const selectedDate = useMemo(
    () => parseISO(selectedDateStr),
    [selectedDateStr],
  );

  const commandes = useMemo(() => {
    const initialIds = new Set(initialCommandes.map((commande) => commande.id));
    const initial = initialCommandes.map(
      (commande) => updatedCommandes.get(commande.id) ?? commande,
    );
    const receivedSinceLoad = Array.from(realtimeCommandes.values()).filter(
      (commande) => !initialIds.has(commande.id),
    );

    return [...initial, ...receivedSinceLoad];
  }, [initialCommandes, realtimeCommandes, updatedCommandes]);

  useEffect(() => {
    if (!latestEvent) return;

    const data = latestEvent.data as Partial<Commande>;
    const commandeId =
      data.id ?? (latestEvent.data as { commandeId?: string }).commandeId;

    if (latestEvent.type === "nouvelle_commande") {
      // Le payload SSE contient la commande complète. On l'insère dans la
      // file locale sans attendre un refresh serveur, puis seulement si elle
      // appartient à la journée affichée.
      if (!data.id || !data.createdAt || !isSameDay(new Date(data.createdAt), selectedDate)) {
        return;
      }
      const timer = window.setTimeout(() => {
        setRealtimeCommandes((previous) => {
          const next = new Map(previous);
          next.set(data.id as string, data as Commande);
          return next;
        });
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (
      latestEvent.type === "livreur_assigne" &&
      typeof commandeId === "string"
    ) {
      const timer = window.setTimeout(() => {
        setRealtimeAssignedDeliveryIds((previous) => {
          if (previous.has(commandeId)) return previous;
          const next = new Set(previous);
          next.add(commandeId);
          return next;
        });
      }, 0);
      return () => window.clearTimeout(timer);
    }

    // Une mise à jour qui arrive depuis un autre écran (ou un autre opérateur)
    // doit aussi être visible immédiatement dans la file courante.
    if (
      latestEvent.type === "statut" &&
      typeof commandeId === "string" &&
      typeof data.statut === "string"
    ) {
      const timer = window.setTimeout(() => {
        setUpdatedCommandes((previous) => {
          const current = previous.get(commandeId) ?? initialCommandes.find((commande) => commande.id === commandeId);
          if (!current || current.statut === data.statut) return previous;
          const next = new Map(previous);
          next.set(commandeId, { ...current, statut: data.statut } as Commande);
          return next;
        });
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [initialCommandes, latestEvent, selectedDate]);

  const counts = useMemo(() => getOrderFilterCounts(commandes), [commandes]);
  const activeWorkCount = counts.recue + counts.en_preparation + counts.prete;

  const serviceCommandes = useMemo(
    () =>
      commandes
        .filter((c) =>
          ["recue", "en_preparation", "prete"].includes(c.statut),
        )
        .sort(sortCommandesForService),
    [commandes],
  );

  const paginatedHistoryOrders: Order[] = useMemo(
    () => initialHistoryCommandes.map((commande) => commandeToOrder(commande)),
    [initialHistoryCommandes],
  );

  const updateHistoryParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.set("historyPage", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (historySearch === initialHistorySearch) return;
    const timer = window.setTimeout(() => {
      updateHistoryParams({ historySearch: historySearch.trim() || undefined });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [historySearch, initialHistorySearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setHistorySearch(initialHistorySearch), 0);
    return () => window.clearTimeout(timer);
  }, [initialHistorySearch]);

  const updateStatut = async (
    commandeId: string,
    statut: Commande["statut"],
  ): Promise<boolean> => {
    // Mise à jour optimiste locale : afficher immédiatement le nouveau statut
    const previous = commandes.find((c) => c.id === commandeId);
    if (!previous) return false;

    setPendingCommandeIds((current) => new Set(current).add(commandeId));

    setUpdatedCommandes((prev) => {
      const next = new Map(prev);
      next.set(commandeId, { ...previous, statut } as Commande);
      return next;
    });

    try {
      const res = await fetch(`/api/commandes/${commandeId}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.error(payload?.error ?? "La commande n'a pas pu être mise à jour.");
        // Rollback local
        setUpdatedCommandes((prev) => {
          const next = new Map(prev);
          next.set(commandeId, previous);
          return next;
        });
        router.refresh();
        return false;
      }
      const responseData = (await res.json()) as { commande: Commande };
      setUpdatedCommandes((prev) => {
        const next = new Map(prev);
        next.set(responseData.commande.id, responseData.commande);
        return next;
      });
      return true;
    } catch {
      toast.error("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.");
      // Rollback local
      setUpdatedCommandes((prev) => {
        const next = new Map(prev);
        next.set(commandeId, previous);
        return next;
      });
      return false;
    } finally {
      setPendingCommandeIds((current) => {
        if (!current.has(commandeId)) return current;
        const next = new Set(current);
        next.delete(commandeId);
        return next;
      });
    }
  };

  const handleViewDetails = (order: Order) => {
    router.push(`/restaurateur/commandes/${order.id}`);
  };

  const handleCheckout = async (order: Order) => {
    const commande = commandes.find((c) => c.id === order.id);
    if (!commande) return false;
    const nextStatut = getNextStatutOnCheckout(commande.statut);
    if (!nextStatut) return false;
    return updateStatut(order.id, nextStatut);
  };

  const handleStatusChange = (order: Order, statut: Commande["statut"]) =>
    updateStatut(order.id, statut);

  const handleDateChange = (date?: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", format(date, "yyyy-MM-dd"));
    } else {
      params.delete("date");
    }
    router.push(`?${params.toString()}`);
  };

  const handleTabChange = (tab: string) => {
    const nextTab = tab as CommandesTab;
    if (nextTab === activeTab) return;
    setTabDirection(nextTab === "historique" ? 1 : -1);
    setActiveTab(nextTab);
  };

  return (
    <div className="flex flex-col min-h-full flex-1 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background mt-4">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Commandes
                </h1>
                {activeWorkCount > 0 && (
                  <Badge className="bg-brand-green/10 text-brand-green hover:bg-brand-green/10">
                    {activeWorkCount} à traiter
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Traitez le service en cours ; consultez l'historique seulement au besoin.
              </p>
            </div>
            <DatePicker date={selectedDate} setDate={handleDateChange} />
          </div>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            variant="underline"
            className="w-full"
          >
            <TabsList className="h-11 w-full justify-start gap-0">
              <TabsTrigger
                value="service"
                className="h-11 gap-2 px-3.5 text-sm data-[active=true]:text-brand-green"
                indicatorClassName="h-0.5 bg-brand-green"
              >
                À traiter
                <Badge className="h-5 min-w-5 rounded-full bg-brand-green/10 px-1.5 text-[11px] font-semibold text-brand-green hover:bg-brand-green/10">
                  {activeWorkCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="historique"
                className="h-11 px-3.5 text-sm"
                indicatorClassName="h-0.5 bg-brand-green"
              >
                Historique
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: reduceMotion ? 0 : tabDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : tabDirection * -24 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === "service" ? (
              serviceCommandes.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Aucune commande à traiter pour cette date.
                </p>
              ) : (
                <div className="space-y-8">
                  {SERVICE_SECTIONS.map((section) => {
                    const orders = serviceCommandes
                      .filter((commande) => commande.statut === section.statut)
                      .map((commande) =>
                        commandeToOrder(commande, {
                          driverAssigned:
                            commande.modeCommande === "livraison"
                              ? assignedDeliveryIds.has(commande.id)
                              : undefined,
                        }),
                      );
                    if (orders.length === 0) return null;

                    return (
                      <section key={section.statut}>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                          <div>
                            <h2 className="text-base font-semibold text-foreground">
                              {section.title}
                            </h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {section.description}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {orders.length}
                          </Badge>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {orders.map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              isUpdating={pendingCommandeIds.has(order.id)}
                              onViewDetails={handleViewDetails}
                              onCheckout={handleCheckout}
                              onStatusChange={handleStatusChange}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )
            ) : (
              <div>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-md">
                    <label className="sr-only" htmlFor="history-search">
                      Rechercher une commande terminée
                    </label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="history-search"
                      value={historySearch}
                      onChange={(event) => {
                        setHistorySearch(event.target.value);
                      }}
                      placeholder="Rechercher par numéro, client ou téléphone"
                      className="h-10 pl-9"
                    />
                  </div>
                  <Select
                    value={historyStatus}
                    onValueChange={(value) => {
                      updateHistoryParams({
                        historyStatus: value === "all" ? undefined : value,
                      });
                    }}
                  >
                    <SelectTrigger aria-label="Filtrer par statut" className="h-10 w-full sm:w-40">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="servie">Terminées</SelectItem>
                      <SelectItem value="annulee">Annulées</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={historyMode}
                    onValueChange={(value) => {
                      updateHistoryParams({
                        historyMode: value === "all" ? undefined : value,
                      });
                    }}
                  >
                    <SelectTrigger aria-label="Filtrer par type" className="h-10 w-full sm:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="sur_place">Sur place</SelectItem>
                      <SelectItem value="emporter">À emporter</SelectItem>
                      <SelectItem value="livraison">Livraison</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paginatedHistoryOrders.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Aucune commande terminée ne correspond à votre recherche.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paginatedHistoryOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                )}

                {historyTotal > 0 && (
                  <Pagination
                    total={historyTotal}
                    page={historyPage}
                    limit={itemsPerPage}
                    onPageChange={(page) => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("historyPage", String(page));
                      router.replace(`?${params.toString()}`, { scroll: false });
                    }}
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
