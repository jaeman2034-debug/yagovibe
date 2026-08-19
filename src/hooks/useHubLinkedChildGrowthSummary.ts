import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { db } from "@/lib/firebase";
import { buildHubGrowthSummaryFromSessions } from "@/lib/ai-growth/hubGrowthSummary";
import { loadGrowthHistoryCanonical } from "@/lib/ai-growth/playerGrowthHistoryService";
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { readParentLinksForTeam } from "@/lib/team/parentLinksRead";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";
import { readPlayers } from "@/lib/team/teamMemberRead";

export type HubLinkedChildGrowthSummary = {
  teamId: string;
  teamName: string;
  playerName: string;
  historySource: "firestore" | "local";
  sessionCount: number;
  latestSessionAt: number;
  /** 최신 세션 Firestore doc ID — Parent Growth Report View */
  latestFirestoreDocId: string;
} & (
  | {
      mode: "comparison";
      summary: NonNullable<ReturnType<typeof buildHubGrowthSummaryFromSessions>>;
    }
  | {
      mode: "first_record";
      currentOverall: number;
    }
);

export type HubGrowthSummaryEmptyReason =
  | "no_parent_membership"
  | "no_linked_child"
  | "not_enough_history"
  | "load_error";

function rosterNameForPlayer(
  playerUid: string,
  roster: Awaited<ReturnType<typeof readPlayers>>,
  academyNames: Map<string, string>
): string {
  if (academyNames.has(playerUid)) return academyNames.get(playerUid)!;
  for (const r of roster) {
    if (
      r.memberDocumentId === playerUid ||
      r.billingUid === playerUid ||
      r.linkedAuthUid === playerUid
    ) {
      return r.displayName.trim() || "자녀";
    }
  }
  return "자녀";
}

export function useHubLinkedChildGrowthSummary(): {
  data: HubLinkedChildGrowthSummary | null;
  loading: boolean;
  emptyReason: HubGrowthSummaryEmptyReason | null;
} {
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [data, setData] = useState<HubLinkedChildGrowthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyReason, setEmptyReason] = useState<HubGrowthSummaryEmptyReason | null>(null);

  useEffect(() => {
    if (teamsLoading) return;

    if (!user?.uid) {
      setData(null);
      setEmptyReason("no_parent_membership");
      setLoading(false);
      return;
    }

    const parentTeamIds = teamMembers
      .filter(
        (tm) =>
          normalizeMemberRole(tm.role) === "parent" &&
          String(tm.status || "active").toLowerCase() === "active" &&
          tm.teamId
      )
      .map((tm) => tm.teamId as string);

    if (parentTeamIds.length === 0) {
      setData(null);
      setEmptyReason("no_parent_membership");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        let hasLinkedChild = false;
        let hasAnyHistory = false;
        for (const teamId of parentTeamIds) {
          const [links, teamSnap, roster, academyPlayers] = await Promise.all([
            readParentLinksForTeam(teamId),
            getDoc(doc(db, "teams", teamId)),
            readPlayers(teamId),
            readAcademyPlayers(teamId),
          ]);
          const academyNames = new Map(academyPlayers.map((p) => [p.playerId, p.displayName]));
          const activeChildren = links.filter(
            (l) => l.parentUid === user.uid && l.status === "active"
          );
          if (activeChildren.length === 0) continue;
          hasLinkedChild = true;

          const teamName = String(teamSnap.data()?.name ?? teamId);

          for (const link of activeChildren) {
            const playerName = rosterNameForPlayer(link.playerUid, roster, academyNames);
            const { sessions, source } = await loadGrowthHistoryCanonical(teamId, playerName, {
              playerId: link.playerUid,
            });
            const scoredSessions = sessions
              .filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0)
              .sort((a, b) => b.generatedAt - a.generatedAt);
            if (scoredSessions.length > 0) {
              hasAnyHistory = true;
            }

            const summary = buildHubGrowthSummaryFromSessions(sessions);
            if (summary) {
              if (!cancelled) {
                setData({
                  mode: "comparison",
                  teamId,
                  teamName,
                  playerName,
                  summary,
                  historySource: source,
                  sessionCount: scoredSessions.length,
                  latestSessionAt: scoredSessions[0]!.generatedAt,
                  latestFirestoreDocId: scoredSessions[0]!.firestoreDocId,
                });
                setEmptyReason(null);
              }
              return;
            }

            if (scoredSessions.length === 1) {
              if (!cancelled) {
                setData({
                  mode: "first_record",
                  teamId,
                  teamName,
                  playerName,
                  currentOverall: scoredSessions[0]!.metrics.growthScore!.overall,
                  historySource: source,
                  sessionCount: 1,
                  latestSessionAt: scoredSessions[0]!.generatedAt,
                  latestFirestoreDocId: scoredSessions[0]!.firestoreDocId,
                });
                setEmptyReason(null);
              }
              return;
            }
          }
        }
        if (!cancelled) {
          setData(null);
          if (!hasLinkedChild) {
            setEmptyReason("no_linked_child");
          } else if (!hasAnyHistory) {
            setEmptyReason("not_enough_history");
          } else {
            setEmptyReason("not_enough_history");
          }
        }
      } catch (error) {
        console.warn("[hubGrowthSummary] load failed", error);
        if (!cancelled) {
          setData(null);
          setEmptyReason("load_error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, teamMembers, teamsLoading]);

  return { data, loading: loading || teamsLoading, emptyReason };
}
