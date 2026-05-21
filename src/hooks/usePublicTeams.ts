/**
 * 🔥 usePublicTeams - 공개 팀 목록 조회 훅 (STEP: 팀원 가입 플로우)
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 ([])
 * - throw ❌
 * - 팀 0개 → [] → 정상
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PublicTeam {
  id: string;
  name: string;
  region?: string;
  sportType?: string;
  description?: string;
  status?: string;
  // 🔥 협회 관계 (배지 표시용)
  associationRelation?: {
    associationId: string;
    status: "official" | "related" | "independent";
  };
  // 하위 호환성 (기존 associationId 필드)
  associationId?: string;
}

interface UsePublicTeamsOptions {
  enabled?: boolean;
  sportType?: string;
}

export function usePublicTeams(options?: UsePublicTeamsOptions) {
  const enabled = options?.enabled !== false;
  const sportType = options?.sportType;

  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTeams([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);

        const teamsRef = collection(db, "teams");
        
        // sportType이 있으면 필터링, 없으면 전체 조회
        const q = sportType
          ? query(teamsRef, where("sportType", "==", sportType))
          : query(teamsRef);

        const snap = await getDocs(q);

        const teamsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PublicTeam[];

        setTeams(teamsData);
      } catch (err) {
        console.warn("[usePublicTeams] 팀 목록 조회 실패 (정상 상태로 처리):", err);
        setTeams([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("팀 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [enabled, sportType]);

  return {
    teams,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
