import type { Commande, Restaurant } from "@/types";
import type { OrderDetailsHeaderProps } from "./order-details-header";

const PLACEHOLDER_IMAGE = "";
const CLIENT_AVATAR = "";
const DRIVER_AVATAR = "";

export interface OrderDetailItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  notes?: string;
  unitPrice: number;
  total: number;
  image: string;
}

export interface TrackingStep {
  id: string;
  label: string;
  date: string;
  time: string;
  completed: boolean;
  current?: boolean;
}

export interface CommandeDetailsView {
  id: string;
  displayId: string;
  rawStatus: Commande["statut"];
  status: OrderDetailsHeaderProps["status"];
  date: string;
  time: string;
  orderType: OrderDetailsHeaderProps["orderType"];
  modeCommande: Commande["modeCommande"];
  items: OrderDetailItem[];
  subtotal: number;
  total: number;
  client: {
    name: string;
    status: string;
    phone: string;
    email: string;
    address: string;
    avatar: string;
  };
  delivery: {
    restaurantName: string;
    restaurantAddress: string;
    customerName: string;
    customerAddress: string;
    distance: string;
    estimatedTime: string;
    departureTime: string;
    departureDate: string;
    arrivalTime: string;
    arrivalDate: string;
  };
  tracking: TrackingStep[];
  driver: {
    name: string;
    status: "en_ligne" | "hors_ligne" | "en_livraison";
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    avatar: string;
  } | null;
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

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function mapStatutToDetailsStatus(
  statut: Commande["statut"]
): OrderDetailsHeaderProps["status"] {
  switch (statut) {
    case "recue":
    case "en_preparation":
      return "en_cours";
    case "prete":
      return "prete";
    case "servie":
      return "livree";
    case "annulee":
      return "annulee";
    default:
      return "en_cours";
  }
}

export function mapModeToOrderType(
  mode: Commande["modeCommande"]
): OrderDetailsHeaderProps["orderType"] {
  switch (mode) {
    case "sur_place":
      return "sur_place";
    case "emporter":
      return "a_emporter";
    case "livraison":
      return "en_ligne";
  }
}

function buildTracking(commande: Commande, created: Date): TrackingStep[] {
  const { statut, modeCommande, updatedAt, heureAcceptee, heurePrete, heureServie } = commande;
  const isLivraison = modeCommande === "livraison";

  const labels = isLivraison
    ? [
        "Commande reçue",
        "En préparation",
        "Prête pour la livraison",
        "En livraison",
        "Livrée",
      ]
    : ["Commande reçue", "En préparation", "Prête", "Servie"];

  const activeIndex: Record<Commande["statut"], number> = {
    annulee: -1,
    recue: 0,
    en_preparation: 1,
    prete: isLivraison ? 3 : 2,
    servie: labels.length - 1,
  };

  const currentIdx = activeIndex[statut];

  return labels.map((label, index) => {
    const completed =
      statut === "servie" || (statut !== "annulee" && index < currentIdx);
    const current =
      statut !== "annulee" && statut !== "servie" && index === currentIdx;
    const showDate = completed || current;

    let stepDate = created;
    if (index === 0) {
      stepDate = created;
    } else if (index === 1 && heureAcceptee) {
      stepDate = new Date(heureAcceptee);
    } else if (index === 2 && heurePrete) {
      stepDate = new Date(heurePrete);
    } else if (index === labels.length - 1 && heureServie) {
      stepDate = new Date(heureServie);
    } else if (current) {
      stepDate = new Date(updatedAt);
    } else if (completed && index === 3 && isLivraison && heurePrete) {
      // Fallback pour "En livraison" si complété
      stepDate = new Date(heurePrete);
    }

    return {
      id: String(index + 1),
      label,
      date: showDate ? formatShortDate(stepDate) : "",
      time: showDate ? formatTime(stepDate) : "",
      completed,
      current,
    };
  });
}

export function commandeToDetailsView(
  commande: Commande,
  restaurant: Restaurant
): CommandeDetailsView {
  const created = new Date(commande.createdAt);
  const orderNote = commande.noteClient?.trim();

  const items: OrderDetailItem[] = commande.items.map((item, index) => ({
    id: `${commande.id}-${index}`,
    name: item.nom,
    category: "Plat",
    quantity: item.quantite,
    notes: index === 0 && orderNote ? orderNote : undefined,
    unitPrice: item.prix,
    total: item.prix * item.quantite,
    image: PLACEHOLDER_IMAGE,
  }));

  const customerAddress =
    commande.modeCommande === "sur_place" && commande.numeroTable
      ? `Table ${commande.numeroTable}`
      : commande.adresseLivraison || restaurant.adresse;

  const distanceLabel =
    commande.distanceKm != null
      ? `${commande.distanceKm.toFixed(1)} km`
      : "—";

  const estimated = new Date(created.getTime() + 30 * 60 * 1000);

  return {
    id: commande.id,
    displayId: commande.numero.startsWith("#") ? commande.numero : commande.numero,
    rawStatus: commande.statut,
    status: mapStatutToDetailsStatus(commande.statut),
    date: formatDate(created),
    time: formatTime(created),
    orderType: mapModeToOrderType(commande.modeCommande),
    modeCommande: commande.modeCommande,
    items,
    subtotal: commande.sousTotal,
    total: commande.total,
    client: {
      name: commande.nomClient,
      status: "Client",
      phone: commande.telephoneClient || "—",
      email: "—",
      address: customerAddress,
      avatar: CLIENT_AVATAR,
    },
    delivery: {
      restaurantName: restaurant.nom,
      restaurantAddress: restaurant.adresse,
      customerName: commande.nomClient,
      customerAddress,
      distance: distanceLabel,
      estimatedTime: commande.modeCommande === "livraison" ? "~30 min" : "—",
      departureTime: formatTime(created),
      departureDate: formatShortDate(created),
      arrivalTime: formatTime(estimated),
      arrivalDate: formatShortDate(estimated),
    },
    tracking: buildTracking(commande, created),
    driver:
      commande.modeCommande === "livraison"
        ? {
            name: "Non assigné",
            status: "hors_ligne",
            phone: commande.telephoneClient || "—",
            vehicleType: "—",
            vehicleNumber: "—",
            avatar: DRIVER_AVATAR,
          }
        : null,
  };
}
