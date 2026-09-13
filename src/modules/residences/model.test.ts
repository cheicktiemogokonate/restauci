import { describe, expect, it } from "vitest";
import { saveResidenceSchema } from "./contracts";
import {
  consumesResidencePublicationQuota,
  evaluateResidenceVisibility,
  getResidenceModerationStatus,
  getResidenceReservationTemporalStatus,
  getResidenceStayNights,
  residenceDateRangesOverlap,
  residenceSlugBase,
  validateResidenceStay,
} from "./model";

describe("residences model", () => {
  it("distingue le brouillon, la revue, la validation et la suspension", () => {
    expect(getResidenceModerationStatus({ publicationIntent: false, actif: false, suspendu: false, motifRejet: null })).toBe("draft");
    expect(getResidenceModerationStatus({ publicationIntent: true, actif: false, suspendu: false, motifRejet: null })).toBe("pending");
    expect(getResidenceModerationStatus({ publicationIntent: true, actif: true, suspendu: false, motifRejet: null })).toBe("approved");
    expect(getResidenceModerationStatus({ publicationIntent: true, actif: true, suspendu: true, motifRejet: null })).toBe("suspended");
  });

  it("produit une base de slug déterministe sans accents", () => {
    expect(residenceSlugBase("  Résidence Ébène — Cocody  ")).toBe(
      "residence-ebene-cocody",
    );
  });

  it("autorise un brouillon sans photo mais exige une photo pour la revue", () => {
    const base = {
      title: "Résidence Ébène",
      description: "Un logement calme et soigneusement aménagé à Cocody.",
      pricePerNightFcfa: 45_000,
      maxGuests: 4,
      address: "Rue des Jardins",
      city: "Abidjan",
      country: "Côte d’Ivoire",
      latitude: null,
      longitude: null,
      photos: [],
    };
    expect(saveResidenceSchema.safeParse({ ...base, publicationIntent: false }).success).toBe(true);
    expect(saveResidenceSchema.safeParse({ ...base, publicationIntent: true }).success).toBe(false);
  });

  it("refuse une paire de coordonnées incomplète", () => {
    const result = saveResidenceSchema.safeParse({
      title: "Résidence Ébène",
      description: "Un logement calme et soigneusement aménagé à Cocody.",
      pricePerNightFcfa: 45_000,
      maxGuests: 4,
      address: "Rue des Jardins",
      city: "Abidjan",
      country: "Côte d’Ivoire",
      latitude: 5.35,
      longitude: null,
      publicationIntent: false,
      photos: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("residence booking dates", () => {
  it("traite les séjours comme des intervalles semi-ouverts", () => {
    expect(getResidenceStayNights({ checkIn: "2026-09-10", checkOut: "2026-09-11" })).toBe(1);
    expect(
      residenceDateRangesOverlap(
        { checkIn: "2026-09-10", checkOut: "2026-09-12" },
        { checkIn: "2026-09-12", checkOut: "2026-09-15" },
      ),
    ).toBe(false);
    expect(
      residenceDateRangesOverlap(
        { checkIn: "2026-09-10", checkOut: "2026-09-13" },
        { checkIn: "2026-09-12", checkOut: "2026-09-15" },
      ),
    ).toBe(true);
  });

  it("refuse les dates passées et les capacités dépassées", () => {
    expect(() => validateResidenceStay({
      checkIn: "2026-08-24",
      checkOut: "2026-08-26",
      guests: 2,
      maxGuests: 4,
      today: "2026-08-25",
    })).toThrow("passée");
    expect(() => validateResidenceStay({
      checkIn: "2026-08-25",
      checkOut: "2026-08-26",
      guests: 5,
      maxGuests: 4,
      today: "2026-08-25",
    })).toThrow("maximum");
  });

  it("projette le séjour à venir, en cours et terminé sans timezone", () => {
    expect(getResidenceReservationTemporalStatus({ checkIn: "2026-09-10", checkOut: "2026-09-12", today: "2026-09-09" })).toBe("a_venir");
    expect(getResidenceReservationTemporalStatus({ checkIn: "2026-09-10", checkOut: "2026-09-12", today: "2026-09-10" })).toBe("en_cours");
    expect(getResidenceReservationTemporalStatus({ checkIn: "2026-09-10", checkOut: "2026-09-12", today: "2026-09-12" })).toBe("terminee");
  });
});

describe("residence public visibility", () => {
  const eligible = {
    publicationIntent: true,
    publicationEnabled: true,
    moderationStatus: "approved" as const,
    ownerIdentityStatus: "verified" as const,
    destinationStatus: "eligible" as const,
    quotaEligible: true,
  };

  it("publie une résidence lorsque tous les gates sont satisfaits", () => {
    expect(evaluateResidenceVisibility(eligible)).toEqual({
      isPubliclyVisible: true,
      blockers: [],
    });
  });

  it("ne publie pas un brouillon et n'expose pas des blocages prématurés", () => {
    expect(
      evaluateResidenceVisibility({
        ...eligible,
        publicationIntent: false,
        moderationStatus: "draft",
      }),
    ).toEqual({
      isPubliclyVisible: false,
      blockers: ["publication_not_requested"],
    });
  });

  it("attend la validation administrative avant les autres gates", () => {
    expect(
      evaluateResidenceVisibility({
        ...eligible,
        moderationStatus: "pending",
        ownerIdentityStatus: "not_submitted",
      }).blockers,
    ).toEqual(["admin_review_pending"]);
  });

  it("explique séparément identité et destination après validation", () => {
    expect(
      evaluateResidenceVisibility({
        ...eligible,
        ownerIdentityStatus: "pending",
        destinationStatus: "unserved",
        quotaEligible: null,
      }).blockers,
    ).toEqual(["identity_review_pending", "destination_unserved"]);
  });

  it("ne considère le quota qu'après les gates de base", () => {
    expect(
      evaluateResidenceVisibility({ ...eligible, quotaEligible: false }),
    ).toEqual({
      isPubliclyVisible: false,
      blockers: ["quota_exceeded"],
    });
  });

  it("attend une publication explicite même après tous les contrôles", () => {
    expect(
      evaluateResidenceVisibility({
        ...eligible,
        publicationEnabled: false,
      }),
    ).toEqual({
      isPubliclyVisible: false,
      blockers: ["partner_publication_disabled"],
    });
  });

  it("bloque toujours une résidence suspendue", () => {
    expect(
      evaluateResidenceVisibility({
        ...eligible,
        moderationStatus: "suspended",
      }).blockers,
    ).toEqual(["residence_suspended"]);
  });

  it("ne consomme le quota que si la résidence est publiée et réellement visible", () => {
    const quotaCandidate = {
      publicationIntent: true,
      publicationEnabled: true,
      moderationStatus: "approved" as const,
      ownerIdentityStatus: "verified" as const,
      destinationStatus: "eligible" as const,
    };
    expect(consumesResidencePublicationQuota(quotaCandidate)).toBe(true);
    expect(
      consumesResidencePublicationQuota({
        ...quotaCandidate,
        publicationEnabled: false,
      }),
    ).toBe(false);
    expect(
      consumesResidencePublicationQuota({
        ...quotaCandidate,
        moderationStatus: "suspended",
      }),
    ).toBe(false);
    expect(
      consumesResidencePublicationQuota({
        ...quotaCandidate,
        ownerIdentityStatus: "pending",
      }),
    ).toBe(false);
  });
});
