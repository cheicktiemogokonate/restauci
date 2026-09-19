import { describe, expect, it } from "vitest";
import {
  etablissementSearchSchema,
  moodSearchSchema,
  type EtablissementItemDTO,
} from "./contracts";

describe("Discovery Contracts - Établissements & Mood", () => {
  const validLocation = {
    lat: 7.69108,
    lng: -5.02895,
    accuracyMeters: 15,
    capturedAt: "2026-09-19T08:00:00.000Z",
  };

  it("valide et applique les valeurs par défaut pour etablissementSearchSchema", () => {
    const parsed = etablissementSearchSchema.parse({
      currentLocation: validLocation,
    });

    expect(parsed.type).toBe("tous");
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(50);
    expect(parsed.radiusKm).toBe(50);
    expect(parsed.search).toBeUndefined();
  });

  it("accepte des filtres spécifiques de type et de rayon pour la carte", () => {
    const parsed = etablissementSearchSchema.parse({
      currentLocation: validLocation,
      type: "restaurant",
      page: 2,
      limit: 25,
      radiusKm: 30,
      search: "maquis",
    });

    expect(parsed.type).toBe("restaurant");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(25);
    expect(parsed.radiusKm).toBe(30);
    expect(parsed.search).toBe("maquis");
  });

  it("valide et applique les valeurs par défaut pour moodSearchSchema", () => {
    const parsed = moodSearchSchema.parse({
      currentLocation: validLocation,
      mood: "entre_amis",
      query: "#piscine",
    });

    expect(parsed.type).toBe("tous");
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.mood).toBe("entre_amis");
    expect(parsed.query).toBe("#piscine");
  });

  it("rejette les coordonnées géographiques invalides", () => {
    expect(() =>
      etablissementSearchSchema.parse({
        currentLocation: {
          lat: 95, // Lat > 90
          lng: -5.02895,
          accuracyMeters: 15,
          capturedAt: "2026-09-19T08:00:00.000Z",
        },
      }),
    ).toThrow();
  });

  it("structure correctement le DTO unifié EtablissementItemDTO", () => {
    const sampleItem: EtablissementItemDTO = {
      id: "test-id",
      type: "restaurant",
      nom: "Le Palais de Bouaké",
      slug: "le-palais-de-bouake",
      description: "Restaurant traditionnel ivoirien",
      adresse: "Quartier Commerce, Bouaké",
      ville: "Bouaké",
      latitude: 7.69108,
      longitude: -5.02895,
      distanceKm: 0.5,
      imageUrl: "https://example.com/logo.jpg",
      noteMoyenne: 4.8,
      nombreAvis: 42,
      enLigne: true,
      prixAffiche: "Min. 2 000 FCFA",
      prixFcfa: 2000,
      tags: ["Africaine", "Grillades"],
      placement: "promoted",
      partnerBadgeEnabled: true,
      discoveryToken: "token-12345",
    };

    expect(sampleItem.type).toBe("restaurant");
    expect(sampleItem.distanceKm).toBe(0.5);
    expect(sampleItem.latitude).toBe(7.69108);
  });
});
