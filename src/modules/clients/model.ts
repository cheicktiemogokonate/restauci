export type ClientDomainErrorCode =
  | "CLIENT_NOT_FOUND"
  | "CLIENT_INACTIVE"
  | "CLIENT_CREDENTIALS_INVALID"
  | "CLIENT_ALREADY_EXISTS"
  | "CLIENT_CURRENT_PASSWORD_INVALID"
  | "CLIENT_TRANSITION_INVALID";

export class ClientDomainError extends Error {
  constructor(
    public readonly code: ClientDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ClientDomainError";
  }
}

export function assertClientCanTransition(
  active: boolean,
  target: "suspended" | "active",
) {
  if ((target === "suspended" && !active) || (target === "active" && active)) {
    throw new ClientDomainError(
      "CLIENT_TRANSITION_INVALID",
      target === "suspended"
        ? "Seul un client actif peut être suspendu."
        : "Seul un client suspendu peut être réactivé.",
    );
  }
}
