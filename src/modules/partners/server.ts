import "server-only";

import {
  partnerActivitySchema,
  type ChoosePartnerActivityInput,
} from "./contracts";
import {
  choosePartnerActivityRecord,
  getPartnerAccountRecordByUserId,
} from "./_internal/persistence";

export function getPartnerAccountByUserId(userId: string) {
  return getPartnerAccountRecordByUserId(userId);
}

export function choosePartnerActivity(
  userId: string,
  activityType: ChoosePartnerActivityInput,
) {
  return choosePartnerActivityRecord(
    userId,
    partnerActivitySchema.parse(activityType),
  );
}
