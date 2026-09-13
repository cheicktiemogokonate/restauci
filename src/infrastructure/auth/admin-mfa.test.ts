import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: {
    ADMIN_MFA_REQUIRED: true,
    ADMIN_TOTP_SECRET: "A".repeat(32) as string | undefined,
  },
  consumeAdminTotp: vi.fn(),
  verifyTotp: vi.fn(),
}));

vi.mock("@/infrastructure/env", () => ({ env: mocks.env }));
vi.mock("@/infrastructure/auth/revocation", () => ({
  consumeAdminTotp: mocks.consumeAdminTotp,
}));
vi.mock("./totp", () => ({ verifyTotp: mocks.verifyTotp }));

import { verifyAdminMfa } from "./admin-mfa";

describe("MFA administrateur", () => {
  beforeEach(() => {
    mocks.env.ADMIN_MFA_REQUIRED = true;
    mocks.env.ADMIN_TOTP_SECRET = "A".repeat(32);
    mocks.consumeAdminTotp.mockReset();
    mocks.verifyTotp.mockReset();
  });

  it("n'accepte la désactivation que par le drapeau explicite", async () => {
    mocks.env.ADMIN_MFA_REQUIRED = false;
    mocks.env.ADMIN_TOTP_SECRET = undefined;

    await expect(verifyAdminMfa("admin-1", undefined)).resolves.toBe(
      "disabled",
    );
    expect(mocks.verifyTotp).not.toHaveBeenCalled();
    expect(mocks.consumeAdminTotp).not.toHaveBeenCalled();
  });

  it("reste fail-closed si la protection est active sans secret", async () => {
    mocks.env.ADMIN_TOTP_SECRET = undefined;

    await expect(verifyAdminMfa("admin-1", undefined)).resolves.toBe(
      "not-configured",
    );
  });

  it("refuse un code absent ou invalide", async () => {
    await expect(verifyAdminMfa("admin-1", undefined)).resolves.toBe(
      "invalid",
    );

    mocks.verifyTotp.mockReturnValue(null);
    await expect(verifyAdminMfa("admin-1", "123456")).resolves.toBe(
      "invalid",
    );
  });

  it("accepte une seule consommation Redis du compteur TOTP", async () => {
    mocks.verifyTotp.mockReturnValue(42);
    mocks.consumeAdminTotp.mockResolvedValueOnce(true).mockResolvedValue(false);

    await expect(verifyAdminMfa("admin-1", "123456")).resolves.toBe("ok");
    await expect(verifyAdminMfa("admin-1", "123456")).resolves.toBe(
      "invalid",
    );
  });

  it("échoue fermé lorsque Redis est indisponible", async () => {
    mocks.verifyTotp.mockReturnValue(42);
    mocks.consumeAdminTotp.mockRejectedValue(new Error("Redis indisponible"));

    await expect(verifyAdminMfa("admin-1", "123456")).resolves.toBe(
      "unavailable",
    );
  });
});
