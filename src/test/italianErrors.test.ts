import { describe, expect, it } from "vitest";
import { italianError } from "@/lib/italianErrors";

describe("external error normalization", () => {
  it("classifies auth errors by code regardless of provider wording", () => {
    expect(italianError({ code: "invalid_credentials", message: "Provider details" }, "login"))
      .toBe(italianError({ message: "Invalid login credentials" }, "login"));
    expect(italianError({ code: "invalid_credentials" }, "login"))
      .not.toBe(italianError({}, "login"));
  });
  it("never returns unknown external messages or database details", () => {
    for (const context of ["registration", "booking", "upload", "payment", "deletion", "admin"] as const) {
      const raw = "Unhandled provider fault: private_column=hidden_value";
      expect(italianError({ message: raw }, context)).toBe(italianError(null, context));
      expect(italianError({ message: raw }, context)).not.toContain(raw);
    }
  });
  it("classifies HTTP throttling and network failures separately", () => {
    expect(italianError({ status: 429 })).toBe(italianError({ code: "over_request_rate_limit" }));
    expect(italianError(new Error("Failed to fetch"))).not.toBe(italianError({ status: 429 }));
  });
});