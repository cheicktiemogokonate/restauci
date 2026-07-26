import { describe, expect, it } from "vitest";
import { getSafeClientRedirect } from "../src/lib/client-app/navigation";

describe("redirections du parcours client", () => {
  it("accepte les routes internes du parcours client", () => {
    expect(getSafeClientRedirect("/panier")).toBe("/panier");
    expect(getSafeClientRedirect("/commandes/commande-123")).toBe(
      "/commandes/commande-123",
    );
    expect(getSafeClientRedirect("/client/restaurant/maquis-chez-jo?tab=menu")).toBe(
      "/client/restaurant/maquis-chez-jo?tab=menu",
    );
  });

  it("rejette une destination externe ou hors parcours client", () => {
    expect(getSafeClientRedirect("https://example.com")).toBe("/client");
    expect(getSafeClientRedirect("//example.com")).toBe("/client");
    expect(getSafeClientRedirect("/restaurateur/commandes")).toBe("/client");
  });
});
