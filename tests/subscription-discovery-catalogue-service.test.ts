import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("service du catalogue discovery", () => {
  const catalogue = readFileSync(
    "src/modules/subscriptions/_internal/catalogue.ts",
    "utf8",
  );
  const server = readFileSync("src/modules/subscriptions/server.ts", "utf8");
  const actions = readFileSync(
    "src/lib/actions/admin-subscriptions.ts",
    "utf8",
  );

  it("valide le payload aux frontières publique et transactionnelle", () => {
    expect(server).toContain("subscriptionCataloguePayloadSchema.parse(input)");
    expect(catalogue).toContain(
      "const payload = subscriptionCataloguePayloadSchema.parse(draft.payload)",
    );
  });

  it("verrouille le brouillon puis les offres avant publication", () => {
    const draftLock = catalogue.indexOf(
      "SELECT id FROM ${subscriptionCatalogueDraft} WHERE id = 1 FOR UPDATE",
    );
    const planLock = catalogue.indexOf(
      "SELECT id FROM ${subscriptionPlans} ORDER BY id FOR UPDATE",
    );
    const firstUpdate = catalogue.indexOf(".update(subscriptionPlans)", planLock);
    expect(draftLock).toBeGreaterThan(-1);
    expect(planLock).toBeGreaterThan(draftLock);
    expect(firstUpdate).toBeGreaterThan(planLock);
  });

  it("publie la révision et l'audit avant de supprimer le brouillon", () => {
    const revision = catalogue.indexOf(".insert(subscriptionCatalogueRevisions)");
    const audit = catalogue.indexOf("await persistAuditLog", revision);
    const deleteDraft = catalogue.indexOf(
      ".delete(subscriptionCatalogueDraft)",
      audit,
    );
    expect(revision).toBeGreaterThan(-1);
    expect(audit).toBeGreaterThan(revision);
    expect(deleteDraft).toBeGreaterThan(audit);
  });

  it("ré-authentifie chaque action d'administration", () => {
    for (const action of [
      "saveSubscriptionCatalogueDraftAction",
      "publishSubscriptionCatalogueDraftAction",
      "restoreSubscriptionCatalogueRevisionToDraftAction",
    ]) {
      const start = actions.indexOf(`export async function ${action}`);
      const next = actions.indexOf("export async function", start + 1);
      const slice = actions.slice(start, next === -1 ? undefined : next);
      expect(start).toBeGreaterThan(-1);
      expect(slice).toContain("await getAdminSession()");
    }
  });
});
