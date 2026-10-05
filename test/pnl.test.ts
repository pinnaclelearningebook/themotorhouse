import { describe, expect, it } from "vitest";
import { carPnl, money } from "@/lib/admin/pnl";

/**
 * The P&L is the one place in the dashboard where a wrong number would be
 * acted on as fact, so the rules about what it refuses to compute matter
 * as much as the arithmetic.
 */
describe("carPnl", () => {
  it("computes a margin from actual money", () => {
    const pnl = carPnl({
      acceptedOffer: 28000,
      soldPrice: 34000,
      costLines: [
        { kind: "recon", amount: 900 },
        { kind: "shipping", amount: 1400 },
      ],
    });
    expect(pnl.costs).toBe(2300);
    expect(pnl.margin).toBe(34000 - 28000 - 2300);
    expect(pnl.marginProvisional).toBe(false);
    expect(pnl.missing).toEqual([]);
  });

  it("refuses a margin before the car is sold", () => {
    const pnl = carPnl({
      acceptedOffer: 28000,
      soldPrice: null,
      costLines: [{ kind: "recon", amount: 900 }],
    });
    expect(pnl.margin).toBeNull();
    expect(pnl.missing).toContain("not sold yet");
  });

  it("refuses a margin before an offer is accepted", () => {
    const pnl = carPnl({
      acceptedOffer: null,
      soldPrice: 34000,
      costLines: [],
    });
    expect(pnl.margin).toBeNull();
    expect(pnl.missing).toContain("no accepted offer yet");
  });

  it("marks a margin provisional when no costs are logged", () => {
    // Zero recorded costs is not the same as zero costs, and a margin
    // that ignores recon and shipping flatters the export channel.
    const pnl = carPnl({
      acceptedOffer: 28000,
      soldPrice: 34000,
      costLines: [],
    });
    expect(pnl.margin).toBe(6000);
    expect(pnl.marginProvisional).toBe(true);
    expect(pnl.missing).toContain("no costs logged");
  });

  it("reports a loss rather than clamping at zero", () => {
    const pnl = carPnl({
      acceptedOffer: 30000,
      soldPrice: 29000,
      costLines: [{ kind: "recon", amount: 1200 }],
    });
    expect(pnl.margin).toBe(-2200);
    expect(money(pnl.margin as number)).toBe("−£2,200");
  });

  it("never reads a projected margin", async () => {
    // Guard against someone making the P&L 'complete' by falling back to
    // the decision engine's projection.
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("lib/admin/pnl.ts", "utf8");
    expect(src).not.toMatch(/projected_margin|projectedMargin/);
  });
});

describe("money", () => {
  it("formats whole pounds with thousands separators", () => {
    expect(money(0)).toBe("£0");
    expect(money(1400)).toBe("£1,400");
    expect(money(28000)).toBe("£28,000");
  });
});
