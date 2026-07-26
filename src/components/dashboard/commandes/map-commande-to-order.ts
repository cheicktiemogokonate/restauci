import type { Commande } from "@/types";
import { STATUT_TRANSITIONS } from "@/types/commandes";
import type { Order, OrderArticle } from "./order-card";
import type { OrderStatus } from "./order-filters";

export function mapStatutToOrderStatus(
  statut: Commande["statut"],
): OrderStatus {
  switch (statut) {
    case "recue":
      return "recue";
    case "en_preparation":
      return "en_preparation";
    case "prete":
      return "prete";
    case "servie":
      return "servie";
    case "annulee":
      return "annulee";
    default:
      return "recue";
  }
}

export function mapModeCommande(
  mode: Commande["modeCommande"],
): Order["orderType"] {
  switch (mode) {
    case "sur_place":
      return "Sur place";
    case "emporter":
      return "À emporter";
    case "livraison":
      return "Livraison";
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function commandeToOrder(
  commande: Commande,
  options: { driverAssigned?: boolean } = {},
): Order {
  const created = new Date(commande.createdAt);
  const articles: OrderArticle[] = commande.items.map((item, index) => ({
    id: `${commande.id}-${index}`,
    name: item.nom,
    quantity: item.quantite,
    price: item.prix * item.quantite,
    image: null,
  }));

  return {
    id: commande.id,
    orderId: commande.numero.startsWith("#")
      ? commande.numero
      : `#${commande.numero}`,
    customerName: commande.nomClient,
    date: formatDate(created),
    time: formatTime(created),
    createdAt: created.toISOString(),
    status: mapStatutToOrderStatus(commande.statut),
    orderType: mapModeCommande(commande.modeCommande),
    driverAssigned: options.driverAssigned,
    tableNumber: commande.numeroTable ?? undefined,
    articles,
    total: commande.total,
  };
}

/**
 * Les commandes actives sont une file de travail : les plus anciennes sont
 * les plus urgentes. Les commandes terminées restent accessibles, mais ne
 * doivent jamais masquer une action qui attend le restaurateur.
 */
export function sortCommandesForService(a: Commande, b: Commande): number {
  const priority: Record<Commande["statut"], number> = {
    recue: 0,
    en_preparation: 1,
    prete: 2,
    servie: 3,
    annulee: 4,
  };
  const priorityDifference = priority[a.statut] - priority[b.statut];
  if (priorityDifference !== 0) return priorityDifference;

  const timeDifference =
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  // Les files actives remontent la plus ancienne commande ; l'historique
  // reste lui dans l'ordre antéchronologique habituel.
  return priority[a.statut] < 3 ? timeDifference : -timeDifference;
}

export function matchesOrderFilter(
  commande: Commande,
  filter: string,
): boolean {
  if (filter === "all") return true;
  if (filter === "en_cours") {
    return ["recue", "en_preparation", "prete"].includes(commande.statut);
  }
  return mapStatutToOrderStatus(commande.statut) === filter;
}

export function getOrderFilterCounts(commandes: Commande[]) {
  return {
    all: commandes.length,
    en_cours: commandes.filter((c) =>
      ["recue", "en_preparation", "prete"].includes(c.statut),
    ).length,
    recue: commandes.filter((c) => mapStatutToOrderStatus(c.statut) === "recue")
      .length,
    en_preparation: commandes.filter(
      (c) => mapStatutToOrderStatus(c.statut) === "en_preparation",
    ).length,
    prete: commandes.filter((c) => mapStatutToOrderStatus(c.statut) === "prete")
      .length,
    servie: commandes.filter(
      (c) => mapStatutToOrderStatus(c.statut) === "servie",
    ).length,
    annulee: commandes.filter(
      (c) => mapStatutToOrderStatus(c.statut) === "annulee",
    ).length,
  };
}

export function getNextStatutOnCheckout(
  statut: Commande["statut"],
): Commande["statut"] | null {
  return STATUT_TRANSITIONS[statut]?.[0] ?? null;
}
