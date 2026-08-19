import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { buildParentHomeGrowthGoals } from "@/lib/ai-growth/parentHomeGrowthGoalEngine";
import { getPlayerGrowthTimeline } from "@/lib/ai-growth/getPlayerGrowthTimeline";
import { loadPlayerGrowthAvatarByPlayerId } from "@/lib/ai-growth/playerGrowthAvatarService";
import type {
  PlayerGrowthProfileEmptyReason,
  PlayerGrowthProfilePageData,
} from "@/lib/ai-growth/playerGrowthProfileTypes";
import { readParentLinksForTeam } from "@/lib/team/parentLinksRead";

const TIMELINE_LIMIT = 10;

export function usePlayerGrowthProfilePage(
  teamId: string | undefined,
  playerId: string | undefined,
  options?: { enabled?: boolean }
): {
  data: PlayerGrowthProfilePageData | null;
  loading: boolean;
  emptyReason: PlayerGrowthProfileEmptyReason | null;
} {
  const enabled = options?.enabled !== false;
  const { user } = useAuth();
  const [data, setData] = useState<PlayerGrowthProfilePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyReason, setEmptyReason] = useState<PlayerGrowthProfileEmptyReason | null>(null);

  useEffect(() => {
    const tid = teamId?.trim();
    const pid = playerId?.trim();

    if (!enabled) {
      setData(null);
      setEmptyReason(null);
      setLoading(false);
      return;
    }

    if (!user?.uid) {
      setData(null);
      setEmptyReason("not_authenticated");
      setLoading(false);
      return;
    }

    if (!tid || !pid) {
      setData(null);
      setEmptyReason("missing_params");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setEmptyReason(null);

    void (async () => {
      try {
        const links = await readParentLinksForTeam(tid);
        const linked = links.some(
          (l) =>
            l.parentUid === user.uid &&
            l.playerUid === pid &&
            l.status === "active"
        );
        if (!linked) {
          if (!cancelled) {
            setData(null);
            setEmptyReason("not_linked");
          }
          return;
        }

        const [teamSnap, avatar, timeline] = await Promise.all([
          getDoc(doc(db, "teams", tid)),
          loadPlayerGrowthAvatarByPlayerId(tid, pid),
          getPlayerGrowthTimeline(tid, pid, TIMELINE_LIMIT),
        ]);

        if (!avatar) {
          if (!cancelled) {
            setData(null);
            setEmptyReason("no_avatar");
          }
          return;
        }

        const history = [...timeline.points]
          .reverse()
          .map((p) => ({
            sessionId: p.sessionId,
            sessionDate: p.sessionDate,
            ovr: p.score,
          }));

        if (!cancelled) {
          setData({
            teamId: tid,
            teamName: String(teamSnap.data()?.name ?? tid),
            playerId: pid,
            playerName: avatar.playerName || "선수",
            avatar,
            timeline,
            goals: buildParentHomeGrowthGoals(avatar, 6),
            history,
          });
          setEmptyReason(null);
        }
      } catch (e) {
        console.warn("[usePlayerGrowthProfilePage]", e);
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
  }, [user?.uid, teamId, playerId, enabled]);

  return { data, loading, emptyReason };
}
