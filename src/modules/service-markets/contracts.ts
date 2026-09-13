import { z } from "zod";
import { locationSampleSchema } from "@/shared/geo";
import {
  LOCATION_CONTEXTS,
  LOCATION_POLICY_USES,
  SERVICE_ACTIVITY_TYPES,
  SERVICE_MARKET_CAPABILITY_STATUSES,
  SERVICE_MARKET_STATUSES,
  type ResolvedServiceMarket,
  type ServiceActivityType,
  type ServiceMarketCapabilityStatus,
} from "./model";

export { locationSampleSchema } from "@/shared/geo";

export const resolveServiceMarketSchema = locationSampleSchema.extend({
  context: z.enum(LOCATION_CONTEXTS).default("currentLocation"),
  use: z.enum(LOCATION_POLICY_USES).default("discovery"),
});

export const serviceActivityTypeSchema = z.enum(SERVICE_ACTIVITY_TYPES);
export const serviceMarketStatusSchema = z.enum(SERVICE_MARKET_STATUSES);
export const serviceMarketCapabilityStatusSchema = z.enum(
  SERVICE_MARKET_CAPABILITY_STATUSES,
);

export interface ServiceMarketCapabilityDTO {
  activityType: ServiceActivityType;
  status: ServiceMarketCapabilityStatus;
}

export interface ServiceMarketDTO extends ResolvedServiceMarket {
  capabilities: ServiceMarketCapabilityDTO[];
}

export const setServiceMarketCapabilitySchema = z
  .object({
    serviceMarketId: z.string().uuid(),
    activityType: serviceActivityTypeSchema,
    status: serviceMarketCapabilityStatusSchema,
    adminId: z.string().min(1).max(36),
  })
  .strict();

export const publishServiceMarketVersionSchema = z
  .object({
    serviceMarketId: z.string().uuid(),
    serviceMarketVersionId: z.string().uuid(),
    adminId: z.string().min(1).max(36),
  })
  .strict();

export const createServiceMarketSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(2).max(255),
    countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    adminId: z.string().min(1).max(36),
  })
  .strict();

export const createServiceMarketVersionSchema = z
  .object({
    serviceMarketId: z.string().uuid(),
    includeSourceAreaIds: z.array(z.string().uuid()).min(1).max(500),
    excludeSourceAreaIds: z.array(z.string().uuid()).max(500).default([]),
    adminId: z.string().min(1).max(36),
  })
  .strict()
  .superRefine((input, context) => {
    const include = new Set(input.includeSourceAreaIds);
    for (const areaId of input.excludeSourceAreaIds) {
      if (include.has(areaId)) {
        context.addIssue({
          code: "custom",
          path: ["excludeSourceAreaIds"],
          message: "Une unité ne peut pas être incluse et exclue à la fois.",
        });
      }
    }
  });

export type ResolveServiceMarketInput = z.infer<
  typeof resolveServiceMarketSchema
>;
export type SetServiceMarketCapabilityInput = z.infer<
  typeof setServiceMarketCapabilitySchema
>;
export type PublishServiceMarketVersionInput = z.infer<
  typeof publishServiceMarketVersionSchema
>;
export type CreateServiceMarketInput = z.infer<
  typeof createServiceMarketSchema
>;
export type CreateServiceMarketVersionInput = z.infer<
  typeof createServiceMarketVersionSchema
>;
