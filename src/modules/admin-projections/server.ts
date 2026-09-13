import "server-only";

import {
  adminDashboardProjectionInputSchema,
  type AdminDashboardProjectionInput,
} from "./contracts";
import {
  getAdminActionCenterRecord,
  getAdminActivityRecord,
  getAdminPlatformStatsRecord,
  getPendingSubscriptionRequestsCountRecord,
} from "./_internal/queries";

export function getAdminPlatformStats() {
  return getAdminPlatformStatsRecord();
}

export function getAdminActionCenter() {
  return getAdminActionCenterRecord();
}

export function getAdminActivity(days = 30) {
  const parsed = adminDashboardProjectionInputSchema.parse({ days });
  return getAdminActivityRecord(parsed.days);
}

export function getPendingSubscriptionRequestsCount() {
  return getPendingSubscriptionRequestsCountRecord();
}

export async function getAdminDashboardProjection(
  input: AdminDashboardProjectionInput = {},
) {
  const parsed = adminDashboardProjectionInputSchema.parse(input);
  const [stats, actionCenter, activity] = await Promise.all([
    getAdminPlatformStatsRecord(),
    getAdminActionCenterRecord(),
    getAdminActivityRecord(parsed.days),
  ]);
  return { stats, actionCenter, activity, generatedAt: new Date() };
}
