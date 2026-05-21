/**
 * 🔥 useTeamSchedules - 팀 일정 조회 훅
 * 
 * 역할:
 * - 사용자의 모든 팀 일정 통합 조회
 * - 실시간 구독
 * - teamSchedules 컬렉션 조회
 */

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ScheduleType = "training" | "match";

export interface TeamSchedule {
  id: string;
  teamId: string;
  creatorUid: string;
  type: ScheduleType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  locationName: string;
  locationLat?: number | null;
  locationLng?: number | null;
  memo?: string | null;
  createdAt: Timestamp;
}

interface UseTeamSchedulesOptions {
  teamIds: string[];
  enabled?: boolean;
}

export function useTeamSchedules({ teamIds, enabled = true }: UseTeamSchedulesOptions) {
  const [schedules, setSchedules] = useState<TeamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("🔍 [useTeamSchedules] 훅 실행:", { enabled, teamIds, teamIdsLength: teamIds.length });

    if (!enabled || teamIds.length === 0) {
      console.log("⚠️ [useTeamSchedules] 쿼리 비활성화:", { enabled, teamIdsLength: teamIds.length });
      setSchedules([]);
      setLoading(false);
      return;
    }

    // 🔥 Firestore 'in' 쿼리 제한: 최대 10개
    const teamIdsBatch = teamIds.slice(0, 10);
    console.log("📋 [useTeamSchedules] 쿼리 실행:", { teamIdsBatch });

    const q = query(
      collection(db, "teamSchedules"),
      where("teamId", "in", teamIdsBatch),
      orderBy("startDateTime", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          console.log("✅ [useTeamSchedules] 데이터 수신:", { count: snapshot.docs.length });
          
          // 🔥 첫 번째 문서의 전체 구조 확인
          if (snapshot.docs.length > 0) {
            const firstDoc = snapshot.docs[0];
            const firstData = firstDoc.data();
            console.log("🔍 [useTeamSchedules] 첫 번째 문서 구조:", {
              id: firstDoc.id,
              allFields: Object.keys(firstData),
              teamId: firstData.teamId,
              team_id: firstData.team_id,
              teamID: firstData.teamID,
              team: firstData.team,
              teamRef: firstData.teamRef,
              fullData: firstData
            });
          }
          
          const list = snapshot.docs.map((doc) => {
            const data = doc.data();
            
            // 🔥 teamId 필드명 확인 (다양한 필드명 지원)
            const teamId = data.teamId || data.team_id || data.teamID || 
                          (data.team?.id) || (data.teamRef?.id) || 
                          (typeof data.team === 'string' ? data.team : null);
            
            console.log("  - 일정:", { 
              id: doc.id, 
              teamId: teamId,
              teamIdSource: data.teamId ? 'teamId' : 
                           data.team_id ? 'team_id' : 
                           data.teamID ? 'teamID' : 
                           data.team ? 'team' : 
                           data.teamRef ? 'teamRef' : '없음',
              title: data.title, 
              startDateTime: data.startDateTime,
              allKeys: Object.keys(data)
            });
            
            return {
              id: doc.id,
              teamId: teamId || "", // 🔥 teamId 필드 보정
              ...data,
            };
          }) as TeamSchedule[];
          
          // 🔥 teamId가 있는 것만 필터링
          const validSchedules = list.filter((s) => s.teamId && s.teamId.trim() !== "");
          
          console.log("📋 [useTeamSchedules] 파싱 결과:", {
            total: list.length,
            valid: validSchedules.length,
            teamIds: validSchedules.map((s) => s.teamId)
          });
          
          setSchedules(validSchedules);
          setError(null);
        } catch (err) {
          console.error("❌ [useTeamSchedules] 데이터 파싱 실패:", err);
          setError(err as Error);
          setSchedules([]);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("❌ [useTeamSchedules] 구독 실패:", err);
        // Firestore 인덱스 오류 체크
        if (err instanceof Error && err.message?.includes("index")) {
          console.error("💡 [useTeamSchedules] Firestore 인덱스가 필요합니다. Firebase 콘솔에서 인덱스를 생성하세요.");
        }
        setError(err as Error);
        setSchedules([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teamIds.join(","), enabled]);

  return {
    schedules,
    loading,
    error,
  };
}
