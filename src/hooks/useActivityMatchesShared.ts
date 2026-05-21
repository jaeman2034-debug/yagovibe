import { useEffect, useMemo, useState } from "react";
import { collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ActivityMatch = {
  id: string;
  federationSlug?: string;
  leagueId?: string;
  stage?: "group" | "semi" | "final";
  homeTeam?: string;
  awayTeam?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  matchDate?: string;
  matchTime?: string;
  status?: "scheduled" | "live" | "completed";
};

type SharedState = {
  matches: ActivityMatch[];
  loading: boolean;
  error: string | null;
};

let sharedState: SharedState = {
  matches: [],
  loading: true,
  error: null,
};

let sharedUnsub: null | (() => void) = null;
const sharedListeners = new Set<(state: SharedState) => void>();

function extractFederationSlug(path: string) {
  const segments = path.split("/");
  const idx = segments.findIndex((s) => s === "federations");
  if (idx === -1) return "";
  return segments[idx + 1] || "";
}

function startSharedSubscription() {
  if (sharedUnsub) return;
  sharedUnsub = onSnapshot(
    collectionGroup(db, "matches"),
    (snap) => {
      const rows: ActivityMatch[] = snap.docs.map((d) => {
        const x = d.data() as any;
        const federationSlug = extractFederationSlug(d.ref.path);
        return {
          id: d.id,
          federationSlug: federationSlug || String(x?.federationSlug || ""),
          leagueId: typeof x?.leagueId === "string" ? x.leagueId : "",
          homeTeam: String(x?.homeTeam || ""),
          awayTeam: String(x?.awayTeam || ""),
          homeTeamId: typeof x?.homeTeamId === "string" ? x.homeTeamId : "",
          awayTeamId: typeof x?.awayTeamId === "string" ? x.awayTeamId : "",
          homeScore: typeof x?.homeScore === "number" ? x.homeScore : null,
          awayScore: typeof x?.awayScore === "number" ? x.awayScore : null,
          stage:
            x?.stage === "group" || x?.stage === "semi" || x?.stage === "final"
              ? x.stage
              : undefined,
          matchDate: typeof x?.matchDate === "string" ? x.matchDate : "",
          matchTime: typeof x?.matchTime === "string" ? x.matchTime : "",
          status:
            x?.status === "completed" ? "completed" : x?.status === "live" ? "live" : "scheduled",
        };
      });
      sharedState = { matches: rows, loading: false, error: null };
      sharedListeners.forEach((cb) => cb(sharedState));
    },
    (error) => {
      sharedState = {
        ...sharedState,
        loading: false,
        error: error?.message || "matches 구독에 실패했습니다.",
      };
      sharedListeners.forEach((cb) => cb(sharedState));
    }
  );
}

function stopSharedSubscriptionIfNeeded() {
  if (sharedListeners.size > 0) return;
  if (!sharedUnsub) return;
  sharedUnsub();
  sharedUnsub = null;
}

export function useActivityMatchesShared(scope?: { federationSlug?: string; leagueId?: string }) {
  const [state, setState] = useState<SharedState>(sharedState);

  useEffect(() => {
    const listener = (next: SharedState) => setState(next);
    sharedListeners.add(listener);
    listener(sharedState);
    startSharedSubscription();
    return () => {
      sharedListeners.delete(listener);
      stopSharedSubscriptionIfNeeded();
    };
  }, []);

  const scopedMatches = useMemo(() => {
    let rows = state.matches;
    if (scope?.leagueId) {
      rows = rows.filter((m) => (m.leagueId || "") === scope.leagueId);
    } else if (scope?.federationSlug) {
      rows = rows.filter((m) => (m.federationSlug || "") === scope.federationSlug);
    }
    return rows;
  }, [state.matches, scope?.federationSlug, scope?.leagueId]);

  return {
    matches: scopedMatches,
    loading: state.loading,
    error: state.error,
  };
}

