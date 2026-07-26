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

export interface DriverDetails {
  assigned: boolean;
  name: string;
  status: "en_ligne" | "hors_ligne" | "en_livraison";
  phone: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  avatar: string;
}

export interface DeliveryTrackingDetails {
  status: "en_attente" | "assignee" | "en_route" | "livree" | "echouee";
  assignedAt: Date | null;
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
  fraisLivraison: number;
  remise: number;
  noteClient: string | null;
  total: number;
  client: {
    name: string;
    status: string;
    phone: string;
    email: string;
    address: string;
    tableNumber: string | null;
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
  driver: DriverDetails | null;
  deliveryTracking: DeliveryTrackingDetails | null;
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
  return statut;
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

function buildTracking(
  commande: Commande,
  created: Date,
  deliveryTracking: DeliveryTrackingDetails | null,
): TrackingStep[] {
  const { statut, modeCommande, updatedAt, heureAcceptee, heurePrete, heureServie } = commande;
  const isLivraison = modeCommande === "livraison";

  const labels = isLivraison
    ? [
        "Commande reçue",
        "En préparation",
        "Prête pour la livraison",
        deliveryTracking?.status === "assignee"
          ? "Livreur assigné"
          : "En livraison",
        "Livrée",
      ]
    : ["Commande reçue", "En préparation", "Prête", "Servie"];

  const activeIndex: Record<Commande["statut"], number> = {
    annulee: -1,
    recue: 0,
    en_preparation: 1,
    // Une commande prête attend encore le livreur : elle ne doit pas faire
    // croire qu'elle est déjà "en livraison".
    prete:
      isLivraison && deliveryTracking?.status === "assignee"
        ? 3
        : 2,
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
    } else if (index === 3 && isLivraison && deliveryTracking?.assignedAt) {
      stepDate = new Date(deliveryTracking.assignedAt);
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
  restaurant: Restaurant,
  platPhotos: ReadonlyMap<string, string | null> = new Map(),
  driverDetails: DriverDetails | null = null,
  deliveryTracking: DeliveryTrackingDetails | null = null,
): CommandeDetailsView {
  const created = new Date(commande.createdAt);
  const items: OrderDetailItem[] = commande.items.map((item, index) => ({
    id: `${commande.id}-${index}`,
    name: item.nom,
    category: "Plat",
    quantity: item.quantite,
    notes: item.note,
    unitPrice: item.prix,
    total: item.prix * item.quantite,
    // Le snapshot de commande garantit le nom et le prix historiques ; la
    // photo est enrichie depuis le plat courant lorsqu'elle est disponible.
    image: platPhotos.get(item.platId) ?? PLACEHOLDER_IMAGE,
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
    displayId: commande.numero,
    rawStatus: commande.statut,
    status: mapStatutToDetailsStatus(commande.statut),
    date: formatDate(created),
    time: formatTime(created),
    orderType: mapModeToOrderType(commande.modeCommande),
    modeCommande: commande.modeCommande,
    items,
    subtotal: commande.sousTotal,
    fraisLivraison: commande.fraisLivraison,
    remise: commande.remise,
    noteClient: commande.noteClient?.trim() || null,
    total: commande.total,
    client: {
      name: commande.nomClient,
      status: "Client",
      phone: commande.telephoneClient || "—",
      email: "—",
      address: customerAddress,
      tableNumber: commande.numeroTable,
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
    tracking: buildTracking(commande, created, deliveryTracking),
    deliveryTracking,
    driver:
      commande.modeCommande === "livraison"
        ? driverDetails ?? {
            assigned: false,
            name: "Aucun livreur assigné",
            status: "hors_ligne",
            phone: null,
            vehicleType: null,
            vehicleNumber: null,
            avatar: DRIVER_AVATAR,
          }
        : null,
  };
}
