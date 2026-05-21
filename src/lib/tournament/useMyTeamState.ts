/**
 * 🔥 MyTeamState 조회 Hook (공통 사용)
 * 
 * 서버에서 내려준 팀 + 선수 수를 조회하여
 * resolveMyStep에 전달할 상태를 제공
 */

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import type { MyTeamState } from "./stepResolver";

/**
 * 사용자의 팀 상태 조회 (단일 팀 기준)
 * 
 * 현재는 첫 번째 팀만 조회 (추후 다중 팀 지원 가능)
 */
export function useMyTeamState(sportType?: string): {
  state: MyTeamState;
  teamId: string | null;
  loading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [state, setState] = useState<MyTeamState>({
    hasTeam: false,
    playerCount: 0,
  });
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setState({ hasTeam: false, playerCount: 0 });
      setTeamId(null);
      setLoading(false);
      return;
    }

    if (teamsLoading) {
      return;
    }

    const loadTeamState = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 팀 멤버 조회 (이미 useMyTeams에서 조회됨)
        if (teamMembers.length === 0) {
          setState({ hasTeam: false, playerCount: 0 });
          setTeamId(null);
          setLoading(false);
          return;
        }

        // 2. 첫 번째 팀 선택 (sportType 필터링 가능)
        const firstTeam = teamMembers[0];
        const foundTeamId = firstTeam.teamId;

        // 3. 팀 정보 확인 (sportType 일치 확인)
        if (sportType) {
          try {
            const teamRef = doc(db, "teams", foundTeamId);
            const teamSnap = await getDoc(teamRef);
            if (teamSnap.exists()) {
              const teamData = teamSnap.data();
              if (teamData.sportType !== sportType) {
                // sportType 불일치 → 팀 없음으로 처리
                setState({ hasTeam: false, playerCount: 0 });
                setTeamId(null);
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.error("[useMyTeamState] 팀 정보 조회 실패:", err);
          }
        }

        // 4. 선수 수 조회 (teams/{teamId}/members)
        try {
          const membersRef = collection(db, `teams/${foundTeamId}/members`);
          const membersSnap = await getDocs(membersRef);
          const playerCount = membersSnap.size;

          setState({
            hasTeam: true,
            playerCount,
          });
          setTeamId(foundTeamId);
        } catch (err) {
          console.error("[useMyTeamState] 선수 수 조회 실패:", err);
          // 조회 실패 시 팀은 있지만 선수 수는 0으로 처리
          setState({
            hasTeam: true,
            playerCount: 0,
          });
          setTeamId(foundTeamId);
        }
      } catch (err) {
        console.error("[useMyTeamState] 오류:", err);
        setError(err instanceof Error ? err : new Error("팀 상태 조회 실패"));
        setState({ hasTeam: false, playerCount: 0 });
        setTeamId(null);
      } finally {
        setLoading(false);
      }
    };

    loadTeamState();
  }, [user?.uid, teamMembers, teamsLoading, sportType]);

  return {
    state,
    teamId,
    loading: loading || teamsLoading,
    error,
  };
}
