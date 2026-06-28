import type { Commande } from "@/types";
import type { Order, OrderArticle } from "./order-card";
import type { OrderStatus } from "./order-filters";

export function mapStatutToOrderStatus(statut: Commande["statut"]): OrderStatus {
  switch (statut) {
    case "recue":
    case "en_preparation":
      return "preparing";
    case "prete":
    case "servie":
      return "ready";
    case "annulee":
      return "cancelled";
    default:
      return "preparing";
  }
}

export function mapModeCommande(mode: Commande["modeCommande"]): Order["orderType"] {
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

export function commandeToOrder(commande: Commande): Order {
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
    orderId: commande.numero.startsWith("#") ? commande.numero : `#${commande.numero}`,
    customerName: commande.nomClient,
    date: formatDate(created),
    time: formatTime(created),
    status: mapStatutToOrderStatus(commande.statut),
    orderType: mapModeCommande(commande.modeCommande),
    tableNumber: commande.numeroTable ?? undefined,
    articles,
    total: commande.total,
  };
}

export function matchesOrderFilter(commande: Commande, filter: string): boolean {
  if (filter === "all") return true;
  return mapStatutToOrderStatus(commande.statut) === filter;
}

export function getOrderFilterCounts(commandes: Commande[]) {
  return {
    all: commandes.length,
    preparing: commandes.filter((c) => mapStatutToOrderStatus(c.statut) === "preparing").length,
    ready: commandes.filter((c) => mapStatutToOrderStatus(c.statut) === "ready").length,
    cancelled: commandes.filter((c) => mapStatutToOrderStatus(c.statut) === "cancelled").length,
  };
}

export function getNextStatutOnCheckout(statut: Commande["statut"]): Commande["statut"] | null {
  switch (statut) {
    case "recue":
      return "en_preparation";
    case "en_preparation":
      return "prete";
    case "prete":
      return "servie";
    default:
      return null;
  }
}
