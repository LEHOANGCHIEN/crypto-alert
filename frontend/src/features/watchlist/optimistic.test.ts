import { describe, expect, it } from "vitest";
import { withItem, withoutItem } from "./optimistic";

const a = { symbol: "BTCUSDT", createdAt: "2026-01-01T00:00:00.000Z" };

describe("watchlist optimistic helpers", () => {
  it("appends a new symbol at the end", () => {
    expect(withItem([a], "ETHUSDT", "now").map((i) => i.symbol)).toEqual([
      "BTCUSDT",
      "ETHUSDT",
    ]);
  });
  it("does not duplicate an existing symbol", () => {
    expect(withItem([a], "BTCUSDT", "now")).toEqual([a]);
  });
  it("removes a symbol and ignores a missing one", () => {
    expect(withoutItem([a], "BTCUSDT")).toEqual([]);
    expect(withoutItem([a], "XRPUSDT")).toEqual([a]);
  });
});
