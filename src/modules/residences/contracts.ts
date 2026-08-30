import { z } from "zod";
import type {
  ResidenceBookabilityBlocker,
  ResidenceBookingPaymentMethod,
  ResidenceDestinationStatus,
  ResidenceModerationStatus,
  ResidenceOwnerIdentityStatus,
  ResidenceReservationStatus,
  ResidenceReservationTemporalStatus,
  ResidenceVisibilityBlocker,
} from "./model";
import { RESIDENCE_BOOKING_PAYMENT_METHODS } from "./model";

const nullableCoordinate = z.number().finite().nullable();

export const residencePhotoInputSchema = z.object({
  url: z.string().url("L’URL de la photo est invalide.").max(2_000),
  altText: z.string().trim().max(255).nullable().default(null),
});

export const saveResidenceSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(30).max(3_000),
    pricePerNightFcfa: z.number().int().min(1_000).max(10_000_000),
    maxGuests: z.number().int().min(1).max(100),
    address: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(100).default("Côte d’Ivoire"),
    latitude: nullableCoordinate.refine(
      (value) => value === null || (value >= -90 && value <= 90),
      "La latitude est invalide.",
    ),
    longitude: nullableCoordinate.refine(
      (value) => value === null || (value >= -180 && value <= 180),
      "La longitude est invalide.",
    ),
    publicationIntent: z.boolean().default(false),
    photos: z.array(residencePhotoInputSchema).max(12),
  })
  .superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "La latitude et la longitude doivent être renseignées ensemble.",
      });
    }
    if (value.publicationIntent && value.photos.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["photos"],
        message: "Ajoutez au moins une photo avant de demander la vérification.",
      });
    }
  });

export const residenceIdSchema = z.string().uuid();
export const residenceSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const rejectResidenceSchema = z.object({
  residenceId: residenceIdSchema,
  reason: z.string().trim().min(10).max(1_000),
});
export const suspendResidenceSchema = rejectResidenceSchema;

const residenceDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La date est invalide.");

export const residenceStaySchema = z.object({
  residenceId: residenceIdSchema,
  checkIn: residenceDateSchema,
  checkOut: residenceDateSchema,
  guests: z.number().int().min(1).max(100),
});

export const createResidenceReservationSchema = residenceStaySchema.extend({
  paymentMethod: z.enum(RESIDENCE_BOOKING_PAYMENT_METHODS),
  discoveryToken: z.string().min(20).max(2_000).optional(),
});

export const updatePartnerResidenceReservationSchema = residenceStaySchema
  .omit({ residenceId: true })
  .extend({ reservationId: residenceIdSchema });

export const cancelPartnerResidenceReservationSchema = z.object({
  reservationId: residenceIdSchema,
  reason: z
    .string()
    .trim()
    .min(10, "Précisez le motif de l’annulation (10 caractères minimum).")
    .max(500),
});

export const residenceUnavailablePeriodSchema = z.object({
  residenceId: residenceIdSchema,
  checkIn: residenceDateSchema,
  checkOut: residenceDateSchema,
  reason: z.string().trim().max(255).nullable().default(null),
});

export const residenceUnavailablePeriodIdSchema = z.string().uuid();

export type ResidenceStayInput = z.infer<typeof residenceStaySchema>;
export type CreateResidenceReservationInput = z.infer<
  typeof createResidenceReservationSchema
>;
export type UpdatePartnerResidenceReservationInput = z.infer<
  typeof updatePartnerResidenceReservationSchema
>;
export type CancelPartnerResidenceReservationInput = z.infer<
  typeof cancelPartnerResidenceReservationSchema
>;
export type ResidenceUnavailablePeriodInput = z.infer<
  typeof residenceUnavailablePeriodSchema
>;

export const listAdminResidencesSchema = z.object({
  status: z
    .enum(["draft", "pending", "approved", "rejected", "suspended"])
    .optional(),
  search: z.string().trim().max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const publicResidenceSearchDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La date de séjour est invalide.");

export const publicResidenceSearchSchema = z
  .object({
    destination: z.string().trim().max(100).optional(),
    checkIn: publicResidenceSearchDateSchema.optional(),
    checkOut: publicResidenceSearchDateSchema.optional(),
    guests: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(48).default(12),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.checkIn === undefined) !== (value.checkOut === undefined)) {
      context.addIssue({
        code: "custom",
        path: [value.checkIn ? "checkOut" : "checkIn"],
        message: "Choisissez une date d’arrivée et une date de départ.",
      });
    } else if (value.checkIn && value.checkOut && value.checkOut <= value.checkIn) {
      context.addIssue({
        code: "custom",
        path: ["checkOut"],
        message: "La date de départ doit suivre la date d’arrivée.",
      });
    }
  });

export type SaveResidenceInput = z.infer<typeof saveResidenceSchema>;
export type ListAdminResidencesInput = z.infer<
  typeof listAdminResidencesSchema
>;
export type PublicResidenceSearchInput = z.infer<
  typeof publicResidenceSearchSchema
>;

export interface ResidencePhotoDTO {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface PartnerResidenceDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  pricePerNightFcfa: number;
  maxGuests: number;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  publicationIntent: boolean;
  publicationEnabledAt: string | null;
  moderationStatus: ResidenceModerationStatus;
  motifRejet: string | null;
  motifSuspension: string | null;
  validatedAt: string | null;
  firstPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: ResidencePhotoDTO[];
}

export interface ResidencePublicationStatusDTO {
  isPubliclyVisible: boolean;
  publicationEnabled: boolean;
  canPublish: boolean;
  blockers: ResidenceVisibilityBlocker[];
  ownerIdentityStatus: ResidenceOwnerIdentityStatus;
  destinationStatus: ResidenceDestinationStatus;
  serviceMarketId: string | null;
  serviceMarketName: string | null;
  quota: {
    planCode: string;
    maxPublicResidences: number | null;
    eligible: boolean | null;
    available: boolean;
  };
}

export interface PartnerResidenceWithPublicationDTO
  extends PartnerResidenceDTO {
  publication: ResidencePublicationStatusDTO;
}

export interface PublicResidenceDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  pricePerNightFcfa: number;
  maxGuests: number;
  city: string;
  country: string;
  firstPublishedAt: string;
  photos: ResidencePhotoDTO[];
  bookability: {
    isBookable: boolean;
    blockers: ResidenceBookabilityBlocker[];
  };
  placement: "promoted" | "organic";
  partnerBadgeEnabled: boolean;
  discoveryToken: string;
}

export interface PublicResidenceSearchResultDTO {
  items: PublicResidenceDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResidenceUnavailablePeriodDTO {
  id: string;
  residenceId: string;
  checkIn: string;
  checkOut: string;
  reason: string | null;
  createdAt: string;
}

export interface ResidenceAvailabilityDTO {
  residenceId: string;
  unavailable: Array<{
    checkIn: string;
    checkOut: string;
    source: "reservation" | "owner_block";
  }>;
}

export interface ResidenceReservationDTO {
  id: string;
  residenceId: string;
  residenceSlug: string;
  residenceTitle: string;
  residenceCity: string;
  residenceCoverUrl: string | null;
  residenceMaxGuests: number;
  partnerAccountId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  status: ResidenceReservationStatus;
  temporalStatus: ResidenceReservationTemporalStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pricePerNightSnapshotFcfa: number;
  subtotalFcfa: number;
  totalFcfa: number;
  commissionRateBpsSnapshot: number;
  commissionAmountFcfa: number;
  paymentMethod: ResidenceBookingPaymentMethod;
  paymentStatus: "pending" | "confirmed" | "failed" | "cancelled";
  checkoutUrl: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationSource: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface ResidenceStayQuoteDTO {
  residenceId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pricePerNightFcfa: number;
  subtotalFcfa: number;
  totalFcfa: number;
  available: boolean;
  bookabilityBlockers: ResidenceBookabilityBlocker[];
}

export interface AdminResidenceListItemDTO {
  id: string;
  title: string;
  city: string;
  accountName: string;
  accountEmail: string;
  moderationStatus: ResidenceModerationStatus;
  publicationIntent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminResidenceDetailsDTO extends PartnerResidenceDTO {
  partnerAccountId: string;
  accountName: string;
  accountEmail: string;
  accountPhone: string;
  validatedByAdminId: string | null;
}

export interface AdminResidenceWithPublicationDTO
  extends AdminResidenceDetailsDTO {
  publication: ResidencePublicationStatusDTO;
}
