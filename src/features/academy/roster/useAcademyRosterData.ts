import { useCallback, useEffect, useState } from "react";
import { academyPlayersToRosterRows } from "@/features/academy/roster/academyPlayerRosterRows";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";
import type { AcademyPlayerRow } from "@/lib/team/academyPlayersTypes";
import {
  readCoaches,
  readParents,
  readPlayers,
  readStaff,
  type TeamMemberRow,
} from "@/lib/team/teamMemberRead";
import { readParentLinksForTeam, type ParentLinkRow } from "@/lib/team/parentLinksRead";

export type AcademyRosterData = {
  staff: TeamMemberRow[];
  coaches: TeamMemberRow[];
  players: TeamMemberRow[];
  parents: TeamMemberRow[];
  links: ParentLinkRow[];
  academyPlayers: AcademyPlayerRow[];
};

export function useAcademyRosterData(teamId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AcademyRosterData>({
    staff: [],
    coaches: [],
    players: [],
    parents: [],
    links: [],
    academyPlayers: [],
  });

  const refresh = useCallback(async () => {
    if (!teamId) {
      setData({ staff: [], coaches: [], players: [], parents: [], links: [], academyPlayers: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [staff, coaches, memberPlayers, parents, links, academyPlayers] = await Promise.all([
        readStaff(teamId),
        readCoaches(teamId),
        readPlayers(teamId),
        readParents(teamId),
        readParentLinksForTeam(teamId),
        readAcademyPlayers(teamId),
      ]);
      const rosterPlayerIds = new Set(memberPlayers.map((p) => p.billingUid));
      const academyRows = academyPlayersToRosterRows(academyPlayers).filter(
        (r) => !rosterPlayerIds.has(r.billingUid)
      );
      setData({
        staff,
        coaches,
        players: [...memberPlayers, ...academyRows],
        parents,
        links,
        academyPlayers,
      });
    } catch (e) {
      console.error("[useAcademyRosterData]", e);
      setError("아카데미 명단을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { ...data, loading, error, refresh };
}
