import { describe, expect, it } from "vitest";
import { assertClientCanTransition } from "./model";

describe("client lifecycle", () => {
  it("accepts only real suspend/reactivate transitions", () => {
    expect(() => assertClientCanTransition(true, "suspended")).not.toThrow();
    expect(() => assertClientCanTransition(false, "active")).not.toThrow();
    expect(() => assertClientCanTransition(false, "suspended")).toThrowError(
      expect.objectContaining({ code: "CLIENT_TRANSITION_INVALID" }),
    );
    expect(() => assertClientCanTransition(true, "active")).toThrowError(
      expect.objectContaining({ code: "CLIENT_TRANSITION_INVALID" }),
    );
  });
});
