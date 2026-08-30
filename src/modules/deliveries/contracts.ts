import { z } from "zod";
import {
  DELIVERY_FAILURE_REASONS,
  DELIVERY_OFFER_DECLINE_REASONS,
  DELIVERY_OFFER_STATUSES,
  DELIVERY_PROOF_METHODS,
  DELIVERY_STATUSES,
  DRIVER_AVAILABILITY_STATES,
  type DeliveryOfferStatus,
  type DeliveryProofMethod,
  type DeliveryStatus,
  type DriverAvailabilityState,
} from "./model";

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^\+?[0-9 ]+$/, "Numéro de téléphone invalide");

export const driverVehicleSchema = z.enum([
  "moto",
  "velo",
  "voiture",
  "tricycle",
  "autre",
]);

export const fixedDeliveryCompensationFcfaSchema = z
  .number()
  .int("Le montant doit être exprimé en francs entiers.")
  .positive("Le montant doit être supérieur à zéro.")
  .max(1_000_000, "Le montant ne peut pas dépasser 1 000 000 FCFA.");

export const createRestaurantDriverSchema = z
  .object({
    nom: z.string().trim().min(2).max(120),
    telephone: phoneSchema,
    vehicule: driverVehicleSchema,
    numeroVehicule: z.string().trim().min(2).max(30).optional(),
    photoUrl: z.url().max(2_000).optional(),
    fixedDeliveryCompensationFcfa:
      fixedDeliveryCompensationFcfaSchema.nullable().optional(),
  })
  .strict();

export const updateRestaurantDriverSchema = createRestaurantDriverSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Au moins un champ doit être modifié.",
  });

export const driverLoginSchema = z
  .object({
    loginId: z.string().trim().toUpperCase().min(8).max(32),
    password: z.string().min(1).max(128),
  })
  .strict();

export const permanentDriverPasswordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .max(128)
  .regex(/[a-z]/, "Une lettre minuscule est requise.")
  .regex(/[A-Z]/, "Une lettre majuscule est requise.")
  .regex(/[0-9]/, "Un chiffre est requis.")
  .regex(/[^A-Za-z0-9]/, "Un caractère spécial est requis.");

export const activateDriverCredentialsSchema = z
  .object({
    activationToken: z.string().min(20).max(4_000),
    password: permanentDriverPasswordSchema,
  })
  .strict();

export const setDriverAvailabilitySchema = z
  .object({ available: z.boolean() })
  .strict();

export const proposeDeliverySchema = z
  .object({
    orderId: z.string().uuid(),
    driverId: z.string().uuid(),
  })
  .strict();

export const respondToDeliveryOfferSchema = z
  .object({
    accept: z.boolean(),
    declineReason: z.enum(DELIVERY_OFFER_DECLINE_REASONS).optional(),
    note: z.string().trim().min(3).max(300).optional(),
    becomeUnavailable: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.accept && !value.declineReason) {
      context.addIssue({
        code: "custom",
        path: ["declineReason"],
        message: "Le motif du refus est requis.",
      });
    }
    if (value.accept && (value.declineReason || value.note)) {
      context.addIssue({
        code: "custom",
        path: ["declineReason"],
        message: "Un motif de refus ne peut pas accompagner une acceptation.",
      });
    }
  });

export const startDriverDeliverySchema = z
  .object({ deliveryId: z.string().uuid() })
  .strict();

export const completeDriverDeliverySchema = z
  .object({
    deliveryId: z.string().uuid(),
    proofCode: z.string().regex(/^\d{6}$/).optional(),
    cashCollected: z.boolean().default(false),
  })
  .strict();

export const failDriverDeliverySchema = z
  .object({
    deliveryId: z.string().uuid(),
    reason: z.enum(DELIVERY_FAILURE_REASONS),
    note: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.reason === "other" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Précisez le problème rencontré.",
      });
    }
  });

export const clientConfirmDeliverySchema = z
  .object({ deliveryId: z.string().uuid() })
  .strict();

export const confirmDriverCashRemittanceSchema = z
  .object({
    driverId: z.string().uuid(),
    deliveryIds: z.array(z.string().uuid()).min(1).max(200),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const confirmDriverCompensationPaymentSchema = z
  .object({
    driverId: z.string().uuid(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const listDriverDeliveriesSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export interface RestaurantDeliveryActor {
  userId: string;
  restaurantId: string;
}

export interface DriverCredentialsDTO {
  loginId: string;
  temporaryPassword: string;
  expiresAt: string;
}

export interface DriverFleetDTO {
  id: string;
  nom: string;
  telephone: string;
  photoUrl: string | null;
  vehicule: z.infer<typeof driverVehicleSchema>;
  numeroVehicule: string | null;
  fixedDeliveryCompensationFcfa: number | null;
  active: boolean;
  declaredAvailable: boolean;
  availability: DriverAvailabilityState;
  credentialsIssued: boolean;
  credentialsReady: boolean;
  lastSeenAt: string | null;
  activeDeliveryNumber: string | null;
  pendingCashFcfa: number;
  pendingCashDeliveries: Array<{
    deliveryId: string;
    orderNumber: string;
    amountFcfa: number;
    collectedAt: string;
  }>;
  pendingCompensationFcfa: number;
  compensationHistory: Array<{
    deliveryId: string;
    orderNumber: string;
    amountFcfa: number;
    completedAt: string | null;
    paidAt: string | null;
    paymentNote: string | null;
  }>;
}

export interface DriverMeDTO {
  id: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  vehicle: string | null;
  vehicleNumber: string | null;
  restaurantName: string;
  fixedDeliveryCompensationFcfa: number | null;
  declaredAvailable: boolean;
  availability: DriverAvailabilityState;
  lastSeenAt: string | null;
  pendingCashFcfa: number;
  pendingCompensationFcfa: number;
}

export interface DeliveryOfferDTO {
  id: string;
  deliveryId: string;
  orderNumber: string;
  status: DeliveryOfferStatus;
  expiresAt: string;
  pickupRestaurantName: string;
  pickupAddress: string;
  deliveryArea: string;
  distanceKm: number | null;
  cashToCollectFcfa: number | null;
  compensationAmountFcfa: number | null;
}

export interface DriverMissionDTO {
  id: string;
  orderNumber: string;
  status: DeliveryStatus;
  pickupReady: boolean;
  restaurant: {
    name: string;
    address: string;
    phone: string | null;
  };
  customer: {
    name: string;
    phone: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    instructions: string | null;
  };
  cashToCollectFcfa: number | null;
  compensationAmountFcfa: number | null;
  compensationPaidAt: string | null;
  proofMethod: DeliveryProofMethod | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ClientDeliveryDTO {
  id: string;
  status: DeliveryStatus;
  driver: null | {
    name: string;
    phone: string;
    photoUrl: string | null;
    vehicle: string;
    vehicleNumber: string | null;
    restaurantName: string;
  };
  proofRequired: boolean;
  proofCode: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export const deliveryStatusSchema = z.enum(DELIVERY_STATUSES);
export const deliveryOfferStatusSchema = z.enum(DELIVERY_OFFER_STATUSES);
export const driverAvailabilityStateSchema = z.enum(
  DRIVER_AVAILABILITY_STATES,
);
export const deliveryProofMethodSchema = z.enum(DELIVERY_PROOF_METHODS);

export type CreateRestaurantDriverCommand = z.infer<
  typeof createRestaurantDriverSchema
>;
export type UpdateRestaurantDriverCommand = z.infer<
  typeof updateRestaurantDriverSchema
>;
export type DriverLoginCommand = z.infer<typeof driverLoginSchema>;
export type ActivateDriverCredentialsCommand = z.infer<
  typeof activateDriverCredentialsSchema
>;
export type RespondToDeliveryOfferCommand = z.infer<
  typeof respondToDeliveryOfferSchema
>;
export type FailDriverDeliveryCommand = z.infer<
  typeof failDriverDeliverySchema
>;
export type ConfirmDriverCashRemittanceCommand = z.infer<
  typeof confirmDriverCashRemittanceSchema
>;
export type ConfirmDriverCompensationPaymentCommand = z.infer<
  typeof confirmDriverCompensationPaymentSchema
>;
export type ListDriverDeliveriesCommand = z.infer<
  typeof listDriverDeliveriesSchema
>;
