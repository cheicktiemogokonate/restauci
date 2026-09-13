import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx)$/.test(entry.name)
        ? [path]
        : [];
  });
}

describe("Phase 9 — Clients, Orders, Commissions et Deliveries", () => {
  it("materializes reconciliation and recalculable projections", () => {
    const migration = readFileSync(
      "drizzle/migrations/0042_order_chain_reconciliation.sql",
      "utf8",
    );
    expect(migration).toContain('"restaurant_order_chain_health"');
    expect(migration).toContain('"refresh_restaurant_order_reconciliation"');
    expect(migration).toContain('"client_order_projections"');
    expect(migration).toContain('"restaurant_order_projections"');
    expect(migration).toContain('"dish_order_projections"');
    expect(migration).toContain("legacy_incomplete");
  });

  it("keeps migrated adapters free from direct DB access", () => {
    const roots = [
      "src/app/(dashboard)/(partenaire)/restaurateur/commandes",
      "src/app/(dashboard)/(partenaire)/restaurateur/facturation",
      "src/app/(dashboard)/admin/commandes",
      "src/app/(dashboard)/admin/commissions",
      "src/app/(client)/client",
      "src/app/(client)/commandes",
      "src/app/api/commandes",
      "src/app/api/v1/client/commandes",
      "src/app/api/v1/restaurateur/commandes",
    ];
    for (const file of roots.flatMap(sourceFiles)) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/(lib|infrastructure)\/db/);
      expect(source, file).not.toMatch(/drizzle-orm/);
    }
  });

  it("owns domain presentation and reuses resolved beUI components", () => {
    const roots = [
      "src/modules/clients/presentation",
      "src/modules/orders/presentation",
      "src/modules/commissions/presentation",
      "src/modules/deliveries/presentation",
    ];
    const files = roots.flatMap(sourceFiles);
    expect(files.length).toBeGreaterThan(0);
    const sources = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).toContain("@/components/motion/input");
    expect(sources).toContain("@/components/motion/select");
    expect(sources).toContain("@/components/motion/tabs");
    expect(sources).toContain("@/components/motion/table");
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/@\/(lib|infrastructure)\/db/);
      expect(source, file).not.toMatch(/@\/app\//);
    }
  });

  it("uses one FIFO confirmation path for offline and Paystack settlements", () => {
    const ledger = readFileSync(
      "src/modules/commissions/_internal/ledger.ts",
      "utf8",
    );
    const manual = ledger.slice(
      ledger.indexOf("export async function createManualCommissionSettlement"),
      ledger.indexOf("export async function preparePaystackCommissionSettlement"),
    );
    expect(manual).toContain("createSettlementReservationInTransaction");
    expect(manual).toContain("confirmReservedSettlementInTransaction");
    expect(manual).not.toContain("commissionSettlementAllocations).values");
  });
});
