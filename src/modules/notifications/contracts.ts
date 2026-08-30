import { z } from "zod";

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

export const listDriverNotificationsSchema = listClientNotificationsSchema;
export const markDriverNotificationsReadSchema =
  markClientNotificationsReadSchema;
export const driverExpoSubscriptionSchema = clientExpoSubscriptionSchema;

export type ListDriverNotificationsInput = ListClientNotificationsInput;
export type MarkDriverNotificationsReadInput =
  MarkClientNotificationsReadInput;
