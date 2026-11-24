import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../shared/auth/auth.store";

/** Drops the cached watchlist whenever the signed-in user changes, so one user never sees another's list. */
export function WatchlistSession() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id ?? null);
  useEffect(() => {
    qc.removeQueries({ queryKey: ["watchlist"] });
  }, [userId, qc]);
  return null;
}
