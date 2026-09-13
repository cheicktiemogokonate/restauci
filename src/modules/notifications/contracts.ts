import { z } from "zod";
import {
  NOTIFICATION_DESTINATION_TYPES,
  NOTIFICATION_TEMPLATE_CODES,
  NOTIFICATION_TYPES,
  type NotificationDestination,
  type NotificationDestinationType,
  type NotificationType,
} from "./model";

export interface NotificationWriteInput {
  userId?: string;
  clientId?: string;
  driverId?: string;
  type: NotificationType;
  titre: string;
  message: string;
  destination?: NotificationDestination;
  lienType?: NotificationDestinationType;
  lienId?: string;
  eventId?: string;
  correlationId?: string;
}

export const notificationDestinationSchema = z
  .object({
    type: z.enum(NOTIFICATION_DESTINATION_TYPES),
    id: z.string().trim().min(1).max(128),
  })
  .strict();

export const notificationRecipientSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), id: z.string().uuid() }).strict(),
  z.object({ type: z.literal("client"), id: z.string().uuid() }).strict(),
  z.object({ type: z.literal("driver"), id: z.string().uuid() }).strict(),
]);

export const persistedNotificationSchema = z
  .object({
    userId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    type: z.enum(NOTIFICATION_TYPES),
    titre: z.string().trim().min(1).max(255),
    message: z.string().trim().min(1).max(2_000),
    destination: notificationDestinationSchema.optional(),
    eventId: z.string().uuid().optional(),
    correlationId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const ownerCount = [value.userId, value.clientId, value.driverId].filter(
      Boolean,
    ).length;
    if (ownerCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Une notification doit avoir exactement un destinataire.",
      });
    }
    if (Boolean(value.eventId) !== Boolean(value.correlationId)) {
      context.addIssue({
        code: "custom",
        path: value.eventId ? ["correlationId"] : ["eventId"],
        message: "eventId et correlationId doivent être fournis ensemble.",
      });
    }
  });

export const notificationProjectionEffectSchema = z
  .object({
    type: z.literal("notification.project"),
    payload: z
      .object({
        items: z
          .array(
            z
              .object({
                recipient: notificationRecipientSchema,
                template: z.enum(NOTIFICATION_TEMPLATE_CODES),
                destination: notificationDestinationSchema,
              })
              .strict(),
          )
          .min(1)
          .max(20),
      })
      .strict(),
  })
  .strict();

export type PersistedNotificationInput = z.infer<
  typeof persistedNotificationSchema
>;
export type NotificationProjectionEffect = z.infer<
  typeof notificationProjectionEffectSchema
>;

export const listClientNotificationsSchema = z
  .object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    unreadOnly: z.boolean().default(false),
  })
  .strict();

export const markClientNotificationsReadSchema = z
  .object({
    notificationIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    markAll: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const selected = Boolean(value.notificationIds?.length);
    if (selected === (value.markAll === true)) {
      context.addIssue({
        code: "custom",
        message: "Choisissez des notifications ou marquez-les toutes comme lues.",
      });
    }
  });

export const clientExpoSubscriptionSchema = z
  .object({ expoToken: z.string().min(20).max(500) })
  .strict();

export type ListClientNotificationsInput = z.infer<
  typeof listClientNotificationsSchema
>;
export type MarkClientNotificationsReadInput = z.infer<
  typeof markClientNotificationsReadSchema
>;

export const listUserNotificationsSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  })
  .strict();

export const markUserNotificationsReadSchema = z
  .object({
    notificationIds: z.array(z.string().uuid()).min(1).max(100),
  })
  .strict();

export type ListUserNotificationsInput = z.input<
  typeof listUserNotificationsSchema
>;
export type MarkUserNotificationsReadInput = z.infer<
  typeof markUserNotificationsReadSchema
>;

export const listDriverNotificationsSchema = listClientNotificationsSchema;
export const markDriverNotificationsReadSchema =
  markClientNotificationsReadSchema;
export const driverExpoSubscriptionSchema = clientExpoSubscriptionSchema;

export type ListDriverNotificationsInput = ListClientNotificationsInput;
export type MarkDriverNotificationsReadInput =
  MarkClientNotificationsReadInput;
