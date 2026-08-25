import { describe, expect, it } from "vitest";
import type { Restaurant } from "@/lib/db/types";
import { toPublicRestaurantDTO } from "./public-dto";

describe("public restaurant DTO", () => {
  it("whitelists public fields and excludes internal administration data", () => {
    const row = {
      id: "restaurant-id",
      partnerAccountId: "partner-id",
      slug: "chez-toutci",
      nom: "Chez Toutci",
      description: null,
      telephone: "+2250000000000",
      email: null,
      siteWeb: null,
      adresse: "Abidjan",
      ville: "Abidjan",
      pays: "Côte d'Ivoire",
      latitude: 5.3,
      longitude: -4,
      serviceMarketId: null,
      serviceMarketVersionId: null,
      geoAssignmentStatus: "pending_review",
      geoAssignedAt: null,
      logoUrl: null,
      banniereUrl: null,
      fraisLivraison: 0,
      commandeMinimum: 0,
      modesCommande: ["sur_place"],
      cuisines: [],
      actif: true,
      enLigne: true,
      accepteCommandes: false,
      tempsPreparationMoyen: 20,
      facebook: null,
      instagram: null,
      whatsapp: null,
      nombreCommandes: 7,
      noteMoyenne: 4.5,
      nombreAvis: 3,
      motifRejet: "internal",
      valideParUserId: "admin-id",
      valideAt: new Date(),
      suspendu: false,
      motifSuspension: "internal",
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Restaurant;

    const dto = toPublicRestaurantDTO(row);
    expect(dto).toMatchObject({
      id: "restaurant-id",
      slug: "chez-toutci",
      accepteCommandes: false,
    });
    expect(dto).not.toHaveProperty("partnerAccountId");
    expect(dto).not.toHaveProperty("motifRejet");
    expect(dto).not.toHaveProperty("motifSuspension");
    expect(dto).not.toHaveProperty("valideParUserId");
    expect(dto).not.toHaveProperty("nombreCommandes");
  });
});
