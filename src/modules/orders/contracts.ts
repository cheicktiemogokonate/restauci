import { z } from "zod";
import { locationSampleSchema } from "@/modules/service-markets/contracts";

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
