import { z } from "zod";
import { locationSampleSchema } from "@/shared/geo";
import { RESTAURANT_ORDER_STATUSES } from "./model";

const orderBaseSchema = z.object({
  restaurantSlug: z.string().trim().min(1).max(255),
  modeCommande: z.enum(["sur_place", "livraison", "emporter"]),
  currentLocation: locationSampleSchema.optional(),
  adresseLivraison: z.string().trim().min(1).max(500).optional(),
  latitudeLivraison: z.number().finite().min(-90).max(90).optional(),
  longitudeLivraison: z.number().finite().min(-180).max(180).optional(),
  numeroTable: z.string().trim().min(1).max(10).optional(),
  noteClient: z.string().trim().max(500).optional(),
});

function addOrderLocationIssues(
  data: z.infer<typeof orderBaseSchema>,
  context: z.RefinementCtx,
) {
  if (data.modeCommande === "livraison") {
    if (!data.adresseLivraison) {
      context.addIssue({
        code: "custom",
        message: "Adresse de livraison requise",
        path: ["adresseLivraison"],
      });
    }
    if (data.latitudeLivraison === undefined) {
      context.addIssue({
        code: "custom",
        message: "Latitude de livraison requise",
        path: ["latitudeLivraison"],
      });
    }
    if (data.longitudeLivraison === undefined) {
      context.addIssue({
        code: "custom",
        message: "Longitude de livraison requise",
        path: ["longitudeLivraison"],
      });
    }
  }
  if (data.modeCommande === "sur_place" && !data.numeroTable) {
    context.addIssue({
      code: "custom",
      message: "Numéro de table requis",
      path: ["numeroTable"],
    });
  }
}

export const createRestaurantOrderSchema = orderBaseSchema
  .extend({
    paymentMethod: z.enum(["cash", "mobile_money", "card"]),
    items: z
      .array(
        z
          .object({
            platId: z.string().uuid(),
            quantite: z.number().int().min(1).max(20),
          })
          .strict(),
      )
      .min(1, "Panier vide")
      .max(100, "Panier trop volumineux"),
    idempotencyKey: z.string().uuid(),
    discoveryToken: z.string().min(20).max(2_000).optional(),
    paymentReturnChannel: z.enum(["web", "mobile"]).default("web"),
  })
  .strict()
  .superRefine(addOrderLocationIssues);

export const prevalidateRestaurantOrderSchema = orderBaseSchema
  .pick({
    restaurantSlug: true,
    modeCommande: true,
    currentLocation: true,
    adresseLivraison: true,
    latitudeLivraison: true,
    longitudeLivraison: true,
    numeroTable: true,
  })
  .strict()
  .superRefine(addOrderLocationIssues);

export type CreateRestaurantOrderHttpInput = z.infer<
  typeof createRestaurantOrderSchema
>;
export type PrevalidateRestaurantOrderInput = z.infer<
  typeof prevalidateRestaurantOrderSchema
>;

export const restaurantOrderStatusUpdateSchema = z
  .object({
    statut: z.enum([
      "recue",
      "en_preparation",
      "prete",
      "servie",
      "annulee",
    ]),
  })
  .strict();

export type RestaurantOrderStatusUpdateInput = z.infer<
  typeof restaurantOrderStatusUpdateSchema
>;

export type CreateRestaurantOrderInput = Omit<
  CreateRestaurantOrderHttpInput,
  "idempotencyKey" | "discoveryToken" | "paymentReturnChannel"
>;

export const restaurantOrderListSchema = z
  .object({
    statut: z.enum(RESTAURANT_ORDER_STATUSES).optional(),
    modeCommande: z.enum(["sur_place", "livraison", "emporter"]).optional(),
    search: z.string().trim().max(100).optional(),
    dateDebut: z.date().optional(),
    dateFin: z.date().optional(),
    lifecycle: z.enum(["visible", "history", "all"]).default("visible"),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict();

export type RestaurantOrderListInput = z.input<typeof restaurantOrderListSchema>;

export const clientOrderListSchema = z
  .object({
    search: z.string().trim().min(3).max(80).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();

export type ClientOrderListInput = z.input<typeof clientOrderListSchema>;

export interface RestaurantOrderActor {
  type: "restaurant" | "client" | "delivery" | "system";
  id: string;
  restaurantId?: string;
  clientId?: string;
}

export interface TransitionRestaurantOrderCommand {
  orderId: string;
  targetStatus: (typeof RESTAURANT_ORDER_STATUSES)[number];
  allowedPreviousStatuses?: (typeof RESTAURANT_ORDER_STATUSES)[number][];
  allowDeliveryCompletion?: boolean;
  now?: Date;
}

export interface LegacyRestaurantOrderTransitionInput {
  id: string;
  targetStatus: (typeof RESTAURANT_ORDER_STATUSES)[number];
  restaurantId?: string;
  clientId?: string;
  allowedPreviousStatuses?: (typeof RESTAURANT_ORDER_STATUSES)[number][];
  allowDeliveryCompletion?: boolean;
  now?: Date;
}

export const adminRestaurantOrdersSchema = z
  .object({
    restaurantId: z.uuid(),
    statut: z.enum(RESTAURANT_ORDER_STATUSES).optional(),
    dateDebut: z.date().optional(),
    dateFin: z.date().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict();

export type AdminRestaurantOrdersInput = z.input<
  typeof adminRestaurantOrdersSchema
>;

export const ADMIN_ORDER_SUPPORT_SIGNALS = [
  "stalled",
  "payment_failed",
  "refunded",
  "cancelled_today",
] as const;

export type AdminOrderSupportSignal =
  (typeof ADMIN_ORDER_SUPPORT_SIGNALS)[number];

export const adminOrderSupportSchema = z
  .object({
    restaurantId: z.uuid().optional(),
    restaurantSearch: z.string().trim().max(100).optional(),
    statut: z.enum(RESTAURANT_ORDER_STATUSES).optional(),
    search: z.string().trim().max(100).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(25),
    signal: z.enum(ADMIN_ORDER_SUPPORT_SIGNALS).optional(),
  })
  .strict();

export type AdminOrderSupportInput = z.output<typeof adminOrderSupportSchema>;
