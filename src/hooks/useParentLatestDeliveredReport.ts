import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { db } from "@/lib/firebase";
import { buildHubGrowthSummaryFromSessions } from "@/lib/ai-growth/hubGrowthSummary";
import { formatParentDeltaBadge } from "@/lib/ai-growth/parentGrowthCopy";
import { isGrowthReportViewedLocally } from "@/lib/ai-growth/growthReportFromSession";
import { buildGrowthReportSharePath } from "@/lib/ai-growth/growthReportDelivery";
import { listPlayerGrowthSessions } from "@/lib/ai-growth/playerGrowthHistoryService";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { readParentLinksForTeam } from "@/lib/team/parentLinksRead";
import { readPlayers } from "@/lib/team/teamMemberRead";

export type ParentDeliveredGrowthReport = {
  teamId: string;
  teamName: string;
  playerName: string;
  sessionDocId: string;
  session: PlayerGrowthSessionDoc;
  reportHref: string;
  deltaLabel: string | null;
  isUnread: boolean;
};

function rosterNameForPlayer(
  playerUid: string,
  roster: Awaited<ReturnType<typeof readPlayers>>
): string {
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

function sessionDocIdFromDelivery(session: PlayerGrowthSessionDoc): string | null {
  const path = session.delivery?.sharePath;
  if (path) {
    const id = path.split("/").filter(Boolean).pop();
    if (id) return id;
  }
  return session.firestoreDocId || null;
}

/** Sprint D-1d — linked child의 최신 delivery 세션 (Home 배지) */
export function useParentLatestDeliveredReport(): {
  report: ParentDeliveredGrowthReport | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [report, setReport] = useState<ParentDeliveredGrowthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamsLoading) return;
    if (!user?.uid) {
      setReport(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const parentTeams = teamMembers.filter(
          (tm) =>
            normalizeMemberRole(tm.role) === "parent" &&
            String(tm.status || "active").toLowerCase() === "active" &&
            tm.teamId
        );

        for (const tm of parentTeams) {
          const teamId = tm.teamId!;
          const [links, teamSnap, roster] = await Promise.all([
            readParentLinksForTeam(teamId),
            getDoc(doc(db, "teams", teamId)),
            readPlayers(teamId),
          ]);
          const activeChildren = links.filter(
            (l) => l.parentUid === user.uid && l.status === "active"
          );
          if (activeChildren.length === 0) continue;

          const teamName = String(teamSnap.data()?.name ?? teamId);

          for (const link of activeChildren) {
            const playerName = rosterNameForPlayer(link.playerUid, roster);
            const sessions = await listPlayerGrowthSessions(teamId, playerName);
            const sorted = [...sessions].sort((a, b) => b.generatedAt - a.generatedAt);
            if (sorted.length === 0) continue;

            const withDelivery = sorted.find((s) => s.delivery?.pdfDownloadUrl);
            const target = withDelivery ?? sorted[0]!;
            const sessionDocId =
              sessionDocIdFromDelivery(target) ?? target.firestoreDocId;
            if (!sessionDocId) continue;

            const summary = buildHubGrowthSummaryFromSessions(sessions);
            const deltaLabel = summary
              ? formatParentDeltaBadge(summary.delta.delta ?? 0).label
              : target.metrics.growthScore?.overall
                ? `${target.metrics.growthScore.overall}점`
                : null;

            if (!cancelled) {
              setReport({
                teamId,
                teamName,
                playerName,
                sessionDocId,
                session: target,
                reportHref: buildGrowthReportSharePath(teamId, sessionDocId),
                deltaLabel,
                isUnread: withDelivery
                  ? !isGrowthReportViewedLocally(teamId, sessionDocId)
                  : false,
              });
            }
            return;
          }
        }
        if (!cancelled) setReport(null);
      } catch (error) {
        console.warn("[useParentLatestDeliveredReport]", error);
        if (!cancelled) setReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, teamMembers, teamsLoading]);

  return { report, loading: loading || teamsLoading };
}
