import { describe, expect, it } from "vitest";
import { rowsFromExecuteResult } from "./persistence";

describe("service market execute result adapter", () => {
  it("supports Neon array results", () => {
    expect(rowsFromExecuteResult<{ id: string }>([{ id: "market" }])).toEqual([
      { id: "market" },
    ]);
  });

  it("supports node-postgres row results", () => {
    expect(
      rowsFromExecuteResult<{ id: string }>({ rows: [{ id: "market" }] }),
    ).toEqual([{ id: "market" }]);
  });
});
