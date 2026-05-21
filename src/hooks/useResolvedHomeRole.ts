import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import {
  type HomeRoleSegment,
  resolveHomeRoleSegment,
} from "@/lib/team/resolveHomeRole";

export interface ResolvedHomeRoleState {
  /** teamMemberships 또는 team_members 기반 */
  segment: HomeRoleSegment | null;
  loading: boolean;
  /** 미러 문서가 하나라도 있었는지 */
  usedTeamMembershipsMirror: boolean;
}

/**
 * `/home` 분기용: `users/{uid}/teamMemberships`(CF 미러) 우선, 없으면 `team_members` 인덱스( useMyTeams ) 보조.
 */
export function useResolvedHomeRole(): ResolvedHomeRoleState {
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [mirrorLoading, setMirrorLoading] = useState(true);
  const [mirrorRows, setMirrorRows] = useState<Array<{ role?: string; status?: string }>>([]);

  useEffect(() => {
    if (!user?.uid) {
      setMirrorRows([]);
      setMirrorLoading(false);
      return;
    }

    setMirrorLoading(true);
    const q = query(
      collection(db, "users", user.uid, "teamMemberships"),
      where("status", "==", "active")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            role: data.role as string | undefined,
            status: data.status as string | undefined,
          };
        });
        setMirrorRows(rows);
        setMirrorLoading(false);
      },
      () => {
        setMirrorRows([]);
        setMirrorLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const resolved = useMemo(() => {
    if (mirrorRows.length > 0) {
      const fromMirror = resolveHomeRoleSegment(mirrorRows);
      if (fromMirror) {
        return { segment: fromMirror, usedMirror: true as const };
      }
    }
    const fallback = teamMembers.map((tm) => ({
      role: tm.role,
      status: tm.status,
    }));
    const fromFallback = resolveHomeRoleSegment(fallback);
    return {
      segment: fromFallback,
      usedMirror: false as const,
    };
  }, [mirrorRows, teamMembers]);

  const loading = mirrorLoading || teamsLoading;

  return {
    segment: loading ? null : resolved.segment,
    loading,
    usedTeamMembershipsMirror: resolved.usedMirror,
  };
}
