import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "../../shared/api/http";
import "../../shared/i18n";
import type { WatchlistItem } from "../../shared/api/types";
import { useWatchlistMutations } from "./useWatchlist";

vi.mock("../../shared/api/http", async (orig) => ({
  ...(await orig<typeof import("../../shared/api/http")>()),
  request: vi.fn(),
}));

const previous: WatchlistItem[] = [
  { symbol: "BTCUSDT", createdAt: "2026-01-01T00:00:00.000Z" },
  { symbol: "ETHUSDT", createdAt: "2026-01-02T00:00:00.000Z" },
];

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  qc.setQueryData(["watchlist"], previous);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, ...renderHook(() => useWatchlistMutations(), { wrapper }) };
}

describe("useWatchlist optimistic rollback", () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
  });

  it("PUT rejected → cached list is restored before any refetch", async () => {
    vi.mocked(request).mockImplementation(async () => {
      throw new ApiError("WATCHLIST_LIMIT_REACHED");
    });
    const { qc, result } = setup();
    await act(async () => {
      await result.current.add.mutateAsync("XRPUSDT").catch(() => undefined);
    });
    // No list query observer is mounted, so nothing fetched the list: the data is the rollback itself.
    expect(vi.mocked(request).mock.calls.filter(([m]) => m === "GET")).toHaveLength(0);
    expect(qc.getQueryData(["watchlist"])).toEqual(previous);
  });

  it("DELETE rejected → the removed item is back before any refetch", async () => {
    vi.mocked(request).mockImplementation(async () => {
      throw new ApiError("INTERNAL_ERROR");
    });
    const { qc, result } = setup();
    await act(async () => {
      await result.current.remove.mutateAsync("BTCUSDT").catch(() => undefined);
    });
    expect(vi.mocked(request).mock.calls.filter(([m]) => m === "GET")).toHaveLength(0);
    expect(qc.getQueryData(["watchlist"])).toEqual(previous);
  });
});
