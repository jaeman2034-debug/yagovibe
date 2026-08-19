/**
 * Vision v6-5 — page access: parent link OR coach/admin
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { canViewAIGrowthValidationConsole } from "@/lib/academy/aiGrowthValidationSelectors";
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { readParentLinksForTeam } from "@/lib/team/parentLinksRead";
import type { PlayerIntelligencePersona } from "@/lib/vision/playerIntelligenceTypes";

export type PlayerProfilePageAccess = {
  loading: boolean;
  canViewPage: boolean;
  canViewParentGrowth: boolean;
  canViewIntelligence: boolean;
  persona: PlayerIntelligencePersona | null;
  backHref: string;
};

export function usePlayerProfilePageAccess(
  teamId: string | undefined,
  playerId: string | undefined
): PlayerProfilePageAccess {
  const { user } = useAuth();
  const [state, setState] = useState<PlayerProfilePageAccess>({
    loading: true,
    canViewPage: false,
    canViewParentGrowth: false,
    canViewIntelligence: false,
    persona: null,
    backHref: "/home/parent",
  });

  useEffect(() => {
    const tid = teamId?.trim();
    const pid = playerId?.trim();
    const uid = user?.uid?.trim();

    if (!uid || !tid || !pid) {
      setState({
        loading: false,
        canViewPage: false,
        canViewParentGrowth: false,
        canViewIntelligence: false,
        persona: null,
        backHref: "/home/parent",
      });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    void (async () => {
      try {
        const links = await readParentLinksForTeam(tid);
        const asParent = links.some(
          (l) => l.parentUid === uid && l.playerUid === pid && l.status === "active"
        );

        const teamSnap = await getDoc(doc(db, "teams", tid));
        const teamData = teamSnap.exists() ? teamSnap.data() : null;
        const ownerUid =
          typeof teamData?.ownerUid === "string" ? teamData.ownerUid.trim() : "";
        const isOwner = ownerUid === uid;

        let coachRole = false;
        if (!isOwner) {
          const memberSnap = await getDoc(doc(db, "teams", tid, "members", uid));
          const role = memberSnap.exists()
            ? normalizeMemberRole(String(memberSnap.data()?.role ?? ""))
            : undefined;
          coachRole = canViewAIGrowthValidationConsole(role);
        }

        const asCoach = isOwner || coachRole;
        const canViewPage = asParent || asCoach;
        const persona: PlayerIntelligencePersona | null = asParent
          ? "parent"
          : asCoach
            ? "coach"
            : null;

        if (!cancelled) {
          setState({
            loading: false,
            canViewPage,
            canViewParentGrowth: asParent,
            canViewIntelligence: canViewPage,
            persona,
            backHref: asParent ? "/home/parent" : `/teams/${encodeURIComponent(tid)}/manage?tab=play`,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            canViewPage: false,
            canViewParentGrowth: false,
            canViewIntelligence: false,
            persona: null,
            backHref: "/home/parent",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, teamId, playerId]);

  return state;
}
