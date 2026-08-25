import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validations/auth";
import { partnerActivitySchema } from "@/modules/partners/contracts";

const registration = {
  email: "partenaire@example.com",
  password: "mot-de-passe-solide",
  nom: "Partenaire Toutci",
  telephone: "0700000000",
};

describe("contrat d'inscription partenaire", () => {
  it("limite l'inscription aux informations d'identité et de connexion", () => {
    expect(registerSchema.parse(registration)).toEqual(registration);
  });

  it("accepte Résidence lors du choix d'activité de l'onboarding", () => {
    expect(partnerActivitySchema.parse("residence")).toBe("residence");
  });
});
