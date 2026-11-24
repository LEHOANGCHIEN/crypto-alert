import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UserMe } from "../../shared/api/types";
import { useAuth } from "../../shared/auth/auth.store";
import { WatchlistSession } from "./WatchlistSession";

const user = (id: number) => ({ id, email: `u${id}@x.test`, displayName: `U${id}` }) as unknown as UserMe;

describe("WatchlistSession", () => {
  it("drops cached watchlist data when the user changes and on logout", () => {
    const qc = new QueryClient();
    useAuth.setState({ status: "authenticated", user: user(1) });
    render(
      <QueryClientProvider client={qc}>
        <WatchlistSession />
      </QueryClientProvider>,
    );
    const seed = () => qc.setQueryData(["watchlist"], [{ symbol: "BTCUSDT", createdAt: "x" }]);

    seed();
    act(() => useAuth.setState({ user: user(2) }));
    expect(qc.getQueryData(["watchlist"])).toBeUndefined();

    seed();
    act(() => useAuth.setState({ status: "guest", user: null }));
    expect(qc.getQueryData(["watchlist"])).toBeUndefined();
  });
});
