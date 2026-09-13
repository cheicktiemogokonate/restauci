import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_ACTOR_TYPES } from "./model";

export const auditActorSchema = z
  .object({
    type: z.enum(AUDIT_ACTOR_TYPES),
    id: z.string().trim().min(1).max(128),
  })
  .strict();

const auditDetailsSchema = z.record(z.string(), z.unknown());

export const auditProjectionEffectSchema = z
  .object({
    type: z.literal("audit.project"),
    payload: z
      .object({
        action: z.enum(AUDIT_ACTIONS),
        details: auditDetailsSchema.optional(),
      })
      .strict(),
  })
  .strict();

export const auditInputSchema = z
  .object({
    actor: auditActorSchema,
    action: z.enum(AUDIT_ACTIONS),
    resourceType: z.string().trim().min(1).max(80),
    resourceId: z.string().trim().min(1).max(128),
    eventId: z.string().uuid().optional(),
    correlationId: z.string().uuid().optional(),
    partnerAccountId: z.string().uuid().nullable().default(null),
    details: auditDetailsSchema.optional(),
    createdAt: z.date().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Boolean(value.eventId) !== Boolean(value.correlationId)) {
      context.addIssue({
        code: "custom",
        path: value.eventId ? ["correlationId"] : ["eventId"],
        message: "eventId et correlationId doivent être fournis ensemble.",
      });
    }
  });

export type AuditInput = z.infer<typeof auditInputSchema>;

export const adminAuditListSchema = z
  .object({
    resourceType: z.string().trim().min(1).max(80).optional(),
    resourceId: z.string().trim().min(1).max(128).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

export type AdminAuditListInput = z.input<typeof adminAuditListSchema>;
export type AdminAuditList = z.output<typeof adminAuditListSchema>;

export interface AdminAuditRowDTO {
  id: string;
  adminId: string;
  adminNom: string;
  action: string;
  ressourceType: string;
  ressourceId: string;
  eventId: string | null;
  correlationId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface LegacyAdminAuditInput {
  adminId: string;
  action: AuditInput["action"];
  ressourceType: string;
  ressourceId: string;
  details?: Record<string, unknown>;
}
