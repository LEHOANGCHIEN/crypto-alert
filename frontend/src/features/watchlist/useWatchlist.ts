import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { request } from "../../shared/api/http";
import type { WatchlistItem } from "../../shared/api/types";
import { useAuth } from "../../shared/auth/auth.store";
import { errorText } from "../../shared/i18n/errorText";
import { toast } from "../../shared/ui/toast";
import { withItem, withoutItem } from "./optimistic";

const KEY = ["watchlist"] as const;

export const useWatchlist = () => {
  const authed = useAuth((s) => s.status === "authenticated");
  return useQuery({
    queryKey: KEY,
    queryFn: () => request<WatchlistItem[]>("GET", "/watchlist"),
    enabled: authed,
  });
};

/** Add (PUT) / remove (DELETE) with optimistic update, rollback and a translated error toast. */
function useWatchlistMutation(method: "PUT" | "DELETE") {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (symbol: string) =>
      request<unknown>(method, `/watchlist/${encodeURIComponent(symbol)}`),
    onMutate: async (symbol) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<WatchlistItem[]>(KEY);
      qc.setQueryData<WatchlistItem[]>(KEY, (old = []) =>
        method === "PUT"
          ? withItem(old, symbol, new Date().toISOString())
          : withoutItem(old, symbol),
      );
      return { previous };
    },
    onError: (err, _symbol, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
      toast.error(errorText(t, err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useWatchlistMutations() {
  return {
    add: useWatchlistMutation("PUT"),
    remove: useWatchlistMutation("DELETE"),
  };
}
