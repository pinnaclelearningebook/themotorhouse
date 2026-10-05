import { describe, expect, it } from "vitest";
import { formatReg, isPlausibleReg, normaliseReg } from "../lib/reg";

describe("registration normalisation", () => {
  it("strips whitespace and uppercases", () => {
    expect(normaliseReg("lm70 xyz")).toBe("LM70XYZ");
    expect(normaliseReg("  ab12  cde ")).toBe("AB12CDE");
    expect(normaliseReg("A1")).toBe("A1");
  });

  it("accepts the plate styles still on UK roads", () => {
    for (const reg of [
      "LM70XYZ", // current
      "AB12 CDE", // current, spaced
      "X123ABC", // prefix
      "ABC123X", // suffix
      "ABC123", // dateless
      "1ABC", // personalised
    ]) {
      expect(isPlausibleReg(reg), reg).toBe(true);
    }
  });

  it("rejects input that cannot be a registration", () => {
    for (const reg of ["", "A", "ABCDEFGHIJ", "LAND ROVER", "!!", "ABCDEF"]) {
      expect(isPlausibleReg(reg), reg).toBe(false);
    }
  });

  it("spaces current-style plates for display and leaves others alone", () => {
    expect(formatReg("lm70xyz")).toBe("LM70 XYZ");
    expect(formatReg("ABC123")).toBe("ABC123");
  });
});
