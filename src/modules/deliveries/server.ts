import "server-only";

import {
  consumeTokenOnce,
  isOwnerSessionRevoked,
  isSessionRevoked,
  isTokenBlacklisted,
  revokeOwnerSessions,
  revokeSession,
} from "@/infrastructure/auth/session-revocation";
import {
  signDriverActivationToken,
  verifyDriverAccessToken,
  verifyDriverActivationToken,
  verifyDriverRefreshToken,
} from "@/infrastructure/auth/driver-tokens";
import {
  activateDriverCredentialsSchema,
  clientConfirmDeliverySchema,
  completeDriverDeliverySchema,
  confirmDriverCashRemittanceSchema,
  confirmDriverCompensationPaymentSchema,
  createRestaurantDriverSchema,
  driverLoginSchema,
  failDriverDeliverySchema,
  listDriverDeliveriesSchema,
  proposeDeliverySchema,
  respondToDeliveryOfferSchema,
  setDriverAvailabilitySchema,
  startDriverDeliverySchema,
  updateRestaurantDriverSchema,
  type ActivateDriverCredentialsCommand,
  type CreateRestaurantDriverCommand,
  type DriverLoginCommand,
  type RestaurantDeliveryActor,
  type UpdateRestaurantDriverCommand,
} from "./contracts";
import { DeliveryDomainError } from "./model";
import {
  generateDriverLoginId,
  generateTemporaryDriverPassword,
  getTemporaryPasswordExpiry,
  hashDriverPassword,
  issueDriverSessionTokens,
  verifyDriverPassword,
} from "./_internal/auth";
import {
  activateDriverPasswordPersistence,
  createDriverWithCredentials,
  deactivateDriverPersistence,
  findDriverAuthRecordByLoginId,
  findDriverSessionRecord,
  listRestaurantDriversPersistence,
  recordDriverLogin,
  resetDriverCredentialsPersistence,
  touchDriverLastSeen,
  updateDriverProfile,
} from "./_internal/persistence";
import {
  getClientDeliveryProjection,
  getDriverDeliveryProjection,
  getDriverMeProjection,
  getPendingDriverOfferProjection,
  getRestaurantDeliveryProjection,
  listDriverDeliveriesProjection,
} from "./_internal/projections";
import {
  completeDriverDeliveryPersistence,
  cancelRestaurantDeliveryOrderPersistence,
  confirmClientDeliveryPersistence,
  confirmDriverCashRemittancePersistence,
  confirmDriverCompensationPaymentPersistence,
  failDriverDeliveryPersistence,
  proposeDeliveryPersistence,
  respondToOfferPersistence,
  setDriverAvailabilityPersistence,
  startDriverDeliveryPersistence,
  unassignDeliveryPersistence,
  verifyDriverDeliveryCodePersistence,
} from "./_internal/workflow";

export type { RestaurantDeliveryActor } from "./contracts";
export { DeliveryDomainError } from "./model";

export interface DriverSession {
  driverId: string;
  restaurantId: string;
  sessionId: string;
  credentialsVersion: number;
  name: string;
  declaredAvailable: boolean;
}

export async function createRestaurantDriver(
  actor: RestaurantDeliveryActor,
  command: CreateRestaurantDriverCommand,
) {
  const parsed = createRestaurantDriverSchema.parse(command);
  const now = new Date();
  const driverId = crypto.randomUUID();
  const loginId = generateDriverLoginId();
  const temporaryPassword = generateTemporaryDriverPassword();
  const temporaryPasswordExpiresAt = getTemporaryPasswordExpiry(now);
  const passwordHash = await hashDriverPassword(temporaryPassword);
  const driver = await createDriverWithCredentials({
    actor,
    command: parsed,
    driverId,
    loginId,
    passwordHash,
    temporaryPasswordExpiresAt,
    now,
  });
  return {
    driver,
    credentials: {
      loginId,
      temporaryPassword,
      expiresAt: temporaryPasswordExpiresAt.toISOString(),
    },
  };
}

export function listRestaurantDrivers(restaurantId: string) {
  return listRestaurantDriversPersistence(restaurantId);
}

export async function updateRestaurantDriver(
  actor: RestaurantDeliveryActor,
  driverId: string,
  command: UpdateRestaurantDriverCommand,
) {
  const parsed = updateRestaurantDriverSchema.parse(command);
  return updateDriverProfile({ actor, driverId, command: parsed, now: new Date() });
}

export async function resetDriverCredentials(
  actor: RestaurantDeliveryActor,
  driverId: string,
) {
  const now = new Date();
  const temporaryPassword = generateTemporaryDriverPassword();
  const temporaryPasswordExpiresAt = getTemporaryPasswordExpiry(now);
  const passwordHash = await hashDriverPassword(temporaryPassword);
  const driver = await resetDriverCredentialsPersistence({
    actor,
    driverId,
    passwordHash,
    temporaryPasswordExpiresAt,
    now,
  });
  await revokeOwnerSessions("driver", driver.id);
  return {
    loginId: driver.loginId,
    temporaryPassword,
    expiresAt: temporaryPasswordExpiresAt.toISOString(),
  };
}

export async function deactivateRestaurantDriver(
  actor: RestaurantDeliveryActor,
  driverId: string,
) {
  const result = await deactivateDriverPersistence({
    actor,
    driverId,
    now: new Date(),
  });
  await revokeOwnerSessions("driver", driverId);
  return result;
}

export async function authenticateDriver(command: DriverLoginCommand) {
  const parsed = driverLoginSchema.parse(command);
  const driver = await findDriverAuthRecordByLoginId(parsed.loginId);
  const valid = await verifyDriverPassword(
    parsed.password,
    driver?.passwordHash ?? null,
  );
  if (!driver || !driver.passwordHash || !valid) {
    throw new DeliveryDomainError(
      "DRIVER_INVALID_CREDENTIALS",
      "Identifiant ou mot de passe incorrect.",
    );
  }
  if (!driver.active) {
    throw new DeliveryDomainError(
      "DRIVER_NOT_ACTIVE",
      "Ce compte livreur est désactivé.",
    );
  }
  const now = new Date();
  if (driver.mustChangePassword) {
    if (
      !driver.temporaryPasswordExpiresAt ||
      driver.temporaryPasswordExpiresAt.getTime() <= now.getTime()
    ) {
      throw new DeliveryDomainError(
        "DRIVER_TEMP_PASSWORD_EXPIRED",
        "Les identifiants temporaires ont expiré. Demandez leur réinitialisation au restaurant.",
      );
    }
    const activationToken = await signDriverActivationToken({
      driverId: driver.id,
      restaurantId: driver.restaurantId,
      credentialsVersion: driver.credentialsVersion,
    });
    await recordDriverLogin(driver.id, now);
    return {
      kind: "activation_required" as const,
      activationToken,
      expiresIn: 15 * 60,
    };
  }
  const tokens = await issueDriverSessionTokens({
    driverId: driver.id,
    restaurantId: driver.restaurantId,
    credentialsVersion: driver.credentialsVersion,
  });
  await recordDriverLogin(driver.id, now);
  return {
    kind: "authenticated" as const,
    driver: { id: driver.id, name: driver.name },
    tokens,
  };
}

export async function activateDriverCredentials(
  command: ActivateDriverCredentialsCommand,
) {
  const parsed = activateDriverCredentialsSchema.parse(command);
  const payload = await verifyDriverActivationToken(parsed.activationToken);
  if (!payload) {
    throw new DeliveryDomainError(
      "DRIVER_ACTIVATION_INVALID",
      "Ce lien d'activation est invalide ou expiré.",
    );
  }
  const consumed = await consumeTokenOnce(parsed.activationToken, payload.exp);
  if (!consumed) {
    throw new DeliveryDomainError(
      "DRIVER_ACTIVATION_INVALID",
      "Ce lien d'activation a déjà été utilisé.",
    );
  }
  const passwordHash = await hashDriverPassword(parsed.password);
  const driver = await activateDriverPasswordPersistence({
    driverId: payload.driverId,
    restaurantId: payload.restaurantId,
    credentialsVersion: payload.credentialsVersion,
    passwordHash,
    now: new Date(),
  });
  await revokeOwnerSessions("driver", driver.id);
  return issueDriverSessionTokens({
    driverId: driver.id,
    restaurantId: driver.restaurantId,
    credentialsVersion: driver.credentialsVersion,
  });
}

export async function refreshDriverSession(refreshToken: string) {
  const payload = await verifyDriverRefreshToken(refreshToken);
  const now = Math.floor(Date.now() / 1_000);
  if (!payload || payload.sessionExpiresAt <= now) {
    throw new DeliveryDomainError(
      "DRIVER_SESSION_INVALID",
      "Session livreur expirée ou invalide.",
    );
  }
  if (
    (await isSessionRevoked(payload.sessionId)) ||
    (await isOwnerSessionRevoked(
      "driver",
      payload.driverId,
      payload.issuedAtMs,
    ))
  ) {
    throw new DeliveryDomainError(
      "DRIVER_SESSION_INVALID",
      "Session livreur révoquée.",
    );
  }
  const consumed = await consumeTokenOnce(refreshToken, payload.exp);
  if (!consumed) {
    await revokeSession(payload.sessionId, payload.sessionExpiresAt);
    throw new DeliveryDomainError(
      "DRIVER_SESSION_REPLAYED",
      "Réutilisation de session détectée. Reconnectez-vous.",
    );
  }
  const driver = await findDriverSessionRecord(payload.driverId);
  if (
    !driver?.active ||
    !driver.passwordHash ||
    driver.mustChangePassword ||
    driver.restaurantId !== payload.restaurantId ||
    driver.credentialsVersion !== payload.credentialsVersion
  ) {
    throw new DeliveryDomainError(
      "DRIVER_SESSION_INVALID",
      "Session livreur révoquée.",
    );
  }
  return issueDriverSessionTokens({
    driverId: driver.id,
    restaurantId: driver.restaurantId,
    credentialsVersion: driver.credentialsVersion,
    sessionId: payload.sessionId,
    sessionExpiresAt: payload.sessionExpiresAt,
  });
}

export async function resolveDriverSession(
  accessToken: string,
): Promise<DriverSession> {
  const payload = await verifyDriverAccessToken(accessToken);
  if (!payload) {
    throw new DeliveryDomainError(
      "DRIVER_SESSION_INVALID",
      "Jeton livreur invalide.",
    );
  }
  if (
    (await isTokenBlacklisted(accessToken)) ||
    (await isSessionRevoked(payload.sessionId)) ||
    (await isOwnerSessionRevoked(
      "driver",
      payload.driverId,
      payload.issuedAtMs,
    ))
  ) {
    throw new DeliveryDomainError(
      "DRIVER_SESSION_INVALID",
      "Session livreur révoquée.",
    );
  }
  const driver = await findDriverSessionRecord(payload.driverId);
  if (
    !driver?.active ||
    !driver.passwordHash ||
    driver.mustChangePassword ||
    driver.restaurantId !== payload.restaurantId ||
    driver.credentialsVersion !== payload.credentialsVersion
  ) {
    throw new DeliveryDomainError(
      "DRIVER_SESSION_INVALID",
      "Session livreur invalide.",
    );
  }
  await touchDriverLastSeen(driver.id);
  return {
    driverId: driver.id,
    restaurantId: driver.restaurantId,
    sessionId: payload.sessionId,
    credentialsVersion: driver.credentialsVersion,
    name: driver.name,
    declaredAvailable: driver.declaredAvailable,
  };
}

export async function revokeDriverSession(input: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  const [accessPayload, refreshPayload] = await Promise.all([
    input.accessToken ? verifyDriverAccessToken(input.accessToken) : null,
    input.refreshToken ? verifyDriverRefreshToken(input.refreshToken) : null,
  ]);
  if (
    accessPayload &&
    refreshPayload &&
    (accessPayload.driverId !== refreshPayload.driverId ||
      accessPayload.sessionId !== refreshPayload.sessionId)
  ) {
    throw new DeliveryDomainError(
      "DRIVER_SESSION_INVALID",
      "Jetons de sessions différentes.",
    );
  }
  const sessionId = refreshPayload?.sessionId ?? accessPayload?.sessionId;
  const sessionExpiresAt =
    refreshPayload?.sessionExpiresAt ?? Math.floor(Date.now() / 1_000) + 900;
  await Promise.all([
    ...(input.accessToken && accessPayload
      ? [consumeTokenOnce(input.accessToken, accessPayload.exp)]
      : []),
    ...(input.refreshToken && refreshPayload
      ? [consumeTokenOnce(input.refreshToken, refreshPayload.exp)]
      : []),
    ...(sessionId ? [revokeSession(sessionId, sessionExpiresAt)] : []),
  ]);
  return { loggedOut: true as const };
}

export async function setDriverAvailability(
  session: DriverSession,
  command: { available: boolean },
) {
  const parsed = setDriverAvailabilitySchema.parse(command);
  return setDriverAvailabilityPersistence({
    actor: session,
    available: parsed.available,
    now: new Date(),
  });
}

export async function proposeDeliveryDriver(
  actor: RestaurantDeliveryActor,
  command: { orderId: string; driverId: string },
) {
  const parsed = proposeDeliverySchema.parse(command);
  return proposeDeliveryPersistence({ actor, ...parsed, now: new Date() });
}

export async function respondToDeliveryOffer(
  session: DriverSession,
  offerId: string,
  command: Parameters<typeof respondToDeliveryOfferSchema.parse>[0],
) {
  const parsed = respondToDeliveryOfferSchema.parse(command);
  return respondToOfferPersistence({
    actor: session,
    offerId,
    command: parsed,
    now: new Date(),
  });
}

export function unassignDeliveryDriver(
  actor: RestaurantDeliveryActor,
  deliveryId: string,
) {
  return unassignDeliveryPersistence({ actor, deliveryId, now: new Date() });
}

export function cancelRestaurantDeliveryOrder(
  actor: RestaurantDeliveryActor,
  orderId: string,
) {
  return cancelRestaurantDeliveryOrderPersistence({
    actor,
    orderId,
    now: new Date(),
  });
}

export async function startDriverDelivery(
  session: DriverSession,
  command: { deliveryId: string },
) {
  const parsed = startDriverDeliverySchema.parse(command);
  return startDriverDeliveryPersistence({
    actor: session,
    deliveryId: parsed.deliveryId,
    now: new Date(),
  });
}

export async function completeDriverDelivery(
  session: DriverSession,
  command: { deliveryId: string; proofCode?: string; cashCollected?: boolean },
) {
  const parsed = completeDriverDeliverySchema.parse(command);
  if (parsed.proofCode) {
    const proof = await verifyDriverDeliveryCodePersistence({
      actor: session,
      deliveryId: parsed.deliveryId,
      code: parsed.proofCode,
      now: new Date(),
    });
    if (!proof.verified) {
      throw new DeliveryDomainError(
        "DELIVERY_PROOF_INVALID",
        "Le code de remise est incorrect.",
      );
    }
  }
  return completeDriverDeliveryPersistence({
    actor: session,
    deliveryId: parsed.deliveryId,
    cashCollected: parsed.cashCollected,
    now: new Date(),
  });
}

export async function failDriverDelivery(
  session: DriverSession,
  command: Parameters<typeof failDriverDeliverySchema.parse>[0],
) {
  const parsed = failDriverDeliverySchema.parse(command);
  return failDriverDeliveryPersistence({
    actor: session,
    command: parsed,
    now: new Date(),
  });
}

export async function confirmClientDelivery(
  clientId: string,
  command: { deliveryId: string },
) {
  const parsed = clientConfirmDeliverySchema.parse(command);
  return confirmClientDeliveryPersistence({
    clientId,
    deliveryId: parsed.deliveryId,
    now: new Date(),
  });
}

export async function confirmDriverCashRemittance(
  actor: RestaurantDeliveryActor,
  command: Parameters<typeof confirmDriverCashRemittanceSchema.parse>[0],
) {
  const parsed = confirmDriverCashRemittanceSchema.parse(command);
  return confirmDriverCashRemittancePersistence({
    actor,
    command: parsed,
    now: new Date(),
  });
}

export async function confirmDriverCompensationPayment(
  actor: RestaurantDeliveryActor,
  command: Parameters<
    typeof confirmDriverCompensationPaymentSchema.parse
  >[0],
) {
  const parsed = confirmDriverCompensationPaymentSchema.parse(command);
  return confirmDriverCompensationPaymentPersistence({
    actor,
    command: parsed,
    now: new Date(),
  });
}

export function getDriverMe(session: DriverSession) {
  return getDriverMeProjection(session);
}

export function getPendingDriverOffer(session: DriverSession) {
  return getPendingDriverOfferProjection(session);
}

export function listDriverDeliveries(
  session: DriverSession,
  searchParams: Record<string, string>,
) {
  const pagination = listDriverDeliveriesSchema.parse(searchParams);
  return listDriverDeliveriesProjection({ ...session, pagination });
}

export function getDriverDelivery(
  session: DriverSession,
  deliveryId: string,
) {
  return getDriverDeliveryProjection({ ...session, deliveryId });
}

export function getClientDelivery(clientId: string, orderId: string) {
  return getClientDeliveryProjection({ clientId, orderId });
}

export function getRestaurantDelivery(restaurantId: string, orderId: string) {
  return getRestaurantDeliveryProjection({ restaurantId, orderId });
}
