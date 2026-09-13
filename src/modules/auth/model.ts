export type AuthenticatedUserRole = "partner" | "admin";

export interface AuthenticatedUser {
  id: string;
  email: string;
  nom: string;
  role: AuthenticatedUserRole;
}

export type PartnerCredentialResult =
  | { status: "authenticated"; user: AuthenticatedUser }
  | { status: "invalid_credentials" }
  | { status: "suspended"; userId: string }
  | {
      status:
        | "mfa_not_configured"
        | "mfa_unavailable"
        | "mfa_invalid";
      userId: string;
    };
