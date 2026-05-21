/**
 * 🔥 useMyCareer - 내 커리어 조회 훅 (STEP: 개인 기록 상세 페이지)
 * 
 * 핵심 원칙:
 * - 개인 기록은 '팀 결과를 개인 관점에서 재해석한 뷰(View)'
 * - 원본은 항상 tournamentResults
 * - 안 터지는 패턴 (기본값 [], throw ❌)
 * 
 * 데이터 연결 방식:
 * 1. 내가 속했던 팀들 조회
 * 2. 그 팀들의 tournamentResults 조회
 * 3. 시간순 정렬
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { TournamentResult } from "@/types/tournament";

export interface CareerItem extends TournamentResult {
  teamName?: string;
  tournamentName?: string;
  seasonId?: string; // STEP: 시즌/연도 관리 시스템
}

interface UseMyCareerOptions {
  seasonId?: string | null; // 시즌 필터 (optional, null이면 전체)
}

export function useMyCareer(options?: UseMyCareerOptions) {
  const seasonId = options?.seasonId;
  const { user } = useAuth();
  const [careerItems, setCareerItems] = useState<CareerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setCareerItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchMyCareer = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1️⃣ 내가 속했던 팀들 조회 (team_members에서 모든 팀, active만이 아니라)
        const teamMembersRef = collection(db, "team_members");
        const teamMembersQuery = query(
          teamMembersRef,
          where("uid", "==", user.uid)
          // status 필터 제거: 과거 팀도 포함 (커리어는 모든 팀 포함)
        );

        const teamMembersSnap = await getDocs(teamMembersQuery);
        const teamIds = teamMembersSnap.docs.map((doc) => doc.data().teamId);

        if (teamIds.length === 0) {
          setCareerItems([]);
          setLoading(false);
          return;
        }

        // 2️⃣ 팀들의 tournamentResults 조회
        // Firestore 'in' 제한: 10개 (배치 처리 필요 시 확장 가능)
        const resultsRef = collection(db, "tournamentResults");
        const teamIdsBatch = teamIds.slice(0, 10); // 최대 10개만 처리
        
        let resultsQuery = query(
          resultsRef,
          where("teamId", "in", teamIdsBatch),
          orderBy("recordedAt", "desc")
        );

        // 시즌 필터 추가 (STEP: 시즌/연도 관리 시스템)
        if (seasonId) {
          resultsQuery = query(resultsQuery, where("seasonId", "==", seasonId));
        }

        const resultsSnap = await getDocs(resultsQuery);

        // 3️⃣ 팀 이름, 대회 이름 조회 (선택적)
        const careerItemsData = await Promise.all(
          resultsSnap.docs.map(async (doc) => {
            const result = doc.data() as TournamentResult;
            
            // 팀 이름 조회
            let teamName: string | undefined;
            try {
              const teamRef = doc(db, "teams", result.teamId);
              const teamSnap = await teamRef.get();
              if (teamSnap.exists()) {
                teamName = teamSnap.data().name;
              }
            } catch (err) {
              console.warn("[useMyCareer] 팀 이름 조회 실패:", err);
            }

            // 대회 이름 조회 (간단화: tournamentId만 표시, 나중에 확장 가능)
            const tournamentName = `대회 ${result.tournamentId.slice(0, 8)}...`;

            return {
              ...result,
              id: doc.id,
              teamName,
              tournamentName,
            } as CareerItem;
          })
        );

        // 4️⃣ 시간순 정렬 (이미 orderBy로 정렬되었지만 확실히)
        careerItemsData.sort((a, b) => {
          const aTime = a.recordedAt?.seconds || 0;
          const bTime = b.recordedAt?.seconds || 0;
          return bTime - aTime; // 최신순
        });

        setCareerItems(careerItemsData);
      } catch (err) {
        console.warn("[useMyCareer] 커리어 조회 실패 (정상 상태로 처리):", err);
        setCareerItems([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("커리어 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchMyCareer();
  }, [user?.uid]);

  return {
    careerItems,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
