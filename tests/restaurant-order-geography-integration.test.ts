import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ordre des garde-fous de la commande Restaurant", () => {
  it("valide la géographie avant la commande, la commission et le paiement", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/orders/restaurant-order.ts"),
      "utf8",
    );
    const geography = source.indexOf("validateRestaurantOrderGeography(");
    const orderInsert = source.indexOf(".insert(commandes)");
    const commission = source.indexOf("createCommissionSnapshot(tx");
    const payment = source.indexOf("createTransactionInTransaction(tx");

    expect(geography).toBeGreaterThan(-1);
    expect(orderInsert).toBeGreaterThan(geography);
    expect(commission).toBeGreaterThan(orderInsert);
    expect(payment).toBeGreaterThan(commission);
  });
});
