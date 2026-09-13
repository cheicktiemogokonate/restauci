import { beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityVerificationError } from "@/modules/identity/model";
import type {
  IdentityDraftInput,
  PartnerIdentityVerificationDTO,
} from "@/modules/identity/contracts";

const mocks = vi.hoisted(() => ({
  requirePartnerAccount: vi.fn(),
  revalidatePath: vi.fn(),
  savePartnerIdentityDraft: vi.fn(),
  submitPartnerIdentityVerification: vi.fn(),
  assertPartnerIdentityVerified: vi.fn(),
  requireCurrentPartnerContext: vi.fn(),
  configurePartnerPayoutDestination: vi.fn(),
  refreshPartnerPayoutDestination: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/modules/partners/server", () => ({
  requirePartnerAccount: mocks.requirePartnerAccount,
  requireCurrentPartnerContext: mocks.requireCurrentPartnerContext,
}));

vi.mock("@/modules/identity/server", () => ({
  savePartnerIdentityDraft: mocks.savePartnerIdentityDraft,
  submitPartnerIdentityVerification: mocks.submitPartnerIdentityVerification,
  assertPartnerIdentityVerified: mocks.assertPartnerIdentityVerified,
}));

vi.mock("@/modules/transactions/server", () => ({
  configurePartnerPayoutDestination: mocks.configurePartnerPayoutDestination,
  refreshPartnerPayoutDestination: mocks.refreshPartnerPayoutDestination,
}));

import {
  configurePayoutDestinationAction,
  saveIdentityDraftAction,
  submitIdentityVerificationAction,
} from "./actions";

const input: IdentityDraftInput = {
  legalName: "Aminata Koné",
  documentType: "national_id",
  documentCountryCode: "CI",
  documentExpiresOn: "2030-04-02",
};

const verification: PartnerIdentityVerificationDTO = {
  id: "72eeef16-8daf-416e-9446-22aa1c5a67dc",
  partnerAccountId: "e09a7a44-fc2d-409e-9d67-4e0fe1ffeb78",
  status: "pending",
  legalName: input.legalName,
  documentType: input.documentType,
  documentCountryCode: input.documentCountryCode,
  documentExpiresOn: input.documentExpiresOn,
  rejectionReason: null,
  submittedAt: "2026-09-03T06:44:30.000Z",
  reviewedAt: null,
  verifiedAt: null,
  documents: [],
};

describe("partner identity verification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePartnerAccount.mockResolvedValue({ id: verification.partnerAccountId });
    mocks.requireCurrentPartnerContext.mockResolvedValue({
      identity: { userId: "partner-user" },
      partnerAccount: { id: verification.partnerAccountId },
    });
    mocks.assertPartnerIdentityVerified.mockResolvedValue({
      id: verification.id,
      status: "verified",
      verifiedAt: new Date(),
      legalName: input.legalName,
    });
  });

  it("returns a pending scan error instead of throwing it to React", async () => {
    mocks.submitPartnerIdentityVerification.mockRejectedValue(
      new IdentityVerificationError(
        "DOCUMENT_SCAN_PENDING",
        "Chaque justificatif doit être analysé et assaini avant la soumission.",
      ),
    );

    await expect(submitIdentityVerificationAction(input)).resolves.toEqual({
      success: false,
      message:
        "Chaque justificatif doit être analysé et assaini avant la soumission.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the refreshed verification after a successful submission", async () => {
    mocks.submitPartnerIdentityVerification.mockResolvedValue(verification);

    await expect(submitIdentityVerificationAction(input)).resolves.toEqual({
      success: true,
      message: "Votre dossier a été transmis pour vérification.",
      verification,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/partenaire/verification",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/verifications");
  });

  it("returns the refreshed verification after saving a draft", async () => {
    const draftVerification = { ...verification, status: "not_submitted" as const };
    mocks.savePartnerIdentityDraft.mockResolvedValue(draftVerification);

    await expect(saveIdentityDraftAction(input)).resolves.toEqual({
      success: true,
      message: "Brouillon enregistré.",
      verification: draftVerification,
    });
  });

  it("dérive le partenaire et le nom KYC sans accepter d’identifiant client", async () => {
    const payoutDestination = {
      status: "active" as const,
      type: "mobile_money" as const,
      environment: "test" as const,
      providerVerified: false,
      institutionCode: "WAVE_CI",
      institutionName: "Wave Côte d’Ivoire",
      maskedIdentifier: "•••• 0000",
      verifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mocks.configurePartnerPayoutDestination.mockResolvedValue(payoutDestination);

    await expect(configurePayoutDestinationAction({
      institutionCode: "WAVE_CI",
      accountIdentifier: "0700000000",
    })).resolves.toMatchObject({ success: true, destination: payoutDestination });
    expect(mocks.configurePartnerPayoutDestination).toHaveBeenCalledWith({
      institutionCode: "WAVE_CI",
      accountIdentifier: "0700000000",
      partnerAccountId: verification.partnerAccountId,
      userId: "partner-user",
      businessName: input.legalName,
    });
  });
});
