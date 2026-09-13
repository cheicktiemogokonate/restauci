export class AdminAccountDomainError extends Error {
  constructor(
    public readonly code:
      | "ADMIN_ACCOUNT_NOT_FOUND"
      | "ADMIN_ACCOUNT_EMAIL_TAKEN"
      | "ADMIN_ACCOUNT_INVALID_CONFIRMATION"
      | "ADMIN_ACCOUNT_SELF_SUSPENSION"
      | "ADMIN_ACCOUNT_LAST_ACTIVE"
      | "ADMIN_ACCOUNT_ALREADY_ACTIVE"
      | "ADMIN_ACCOUNT_ALREADY_SUSPENDED",
    message: string,
  ) {
    super(message);
    this.name = "AdminAccountDomainError";
  }
}

export interface AdminAccountActor {
  adminId: string;
}

export const ADMIN_ACCOUNT_CREATED_EVENT_TYPE = "admin.account.created.v1";
export const ADMIN_ACCOUNT_PASSWORD_RESET_EVENT_TYPE =
  "admin.account.passwordreset.v1";
export const ADMIN_ACCOUNT_SUSPENDED_EVENT_TYPE =
  "admin.account.suspended.v1";
export const ADMIN_ACCOUNT_REACTIVATED_EVENT_TYPE =
  "admin.account.reactivated.v1";
