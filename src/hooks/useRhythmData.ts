/**
 * 🔥 useRhythmData - 리듬 데이터 조회 훅
 * 
 * 역할:
 * - 최근 7일 컨디션 데이터 조회
 * - 최근 3일 활동량 계산
 * - 리듬 점수 계산
 * 
 * UX 목적:
 * - 리듬 그래프 데이터 제공
 * - 성장 탭 자동 로드
 */

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DailyCondition } from "@/services/growthService";
import {
  calculateRhythmScoreV2,
  type RhythmScore,
} from "@/utils/rhythmCalculator";
import { useTrainingLoad } from "@/hooks/useTrainingLoad";

/**
 * 🔥 최근 N일 날짜 배열 생성
 */
function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}


/**
 * 🔥 리듬 데이터 조회 훅
 * 
 * @param uid 사용자 UID
 * @returns 리듬 점수 배열, 로딩 상태
 */
export function useRhythmData(uid?: string) {
  const [rhythmScores, setRhythmScores] = useState<RhythmScore[]>([]);
  const [loading, setLoading] = useState(true);
  const { load: trainingLoad } = useTrainingLoad(uid);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const loadRhythmData = async () => {
      try {
        setLoading(true);

        // 🔥 최근 7일 날짜 배열
        const dates = getRecentDates(7);

        // 🔥 최근 7일 컨디션 데이터 조회
        // Firestore에서 date 필드는 문자열이므로 범위 쿼리 가능
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        const q = query(
          collection(db, "dailyCondition"),
          where("uid", "==", uid),
          where("date", ">=", startDate),
          where("date", "<=", endDate),
          orderBy("date", "asc")
        );

        const snap = await getDocs(q);
        const conditionsMap = new Map<string, DailyCondition>();

        snap.docs.forEach((doc) => {
          const data = doc.data() as DailyCondition;
          if (data.date) {
            conditionsMap.set(data.date, data);
          }
        });

        // 🔥 각 날짜별 리듬 점수 계산 (v2: 훈련량 포함)
        const scores: RhythmScore[] = dates.map((date) => {
          const condition = conditionsMap.get(date) || null;
          
          // 🔥 v2: 훈련 부하 데이터 사용
          const score = calculateRhythmScoreV2(condition, trainingLoad);
          
          // 🔥 date 필드 보장 (데이터 없어도 날짜는 유지)
          return {
            ...score,
            date: condition?.date || date,
          };
        });

        setRhythmScores(scores);
      } catch (error) {
        console.error("❌ [useRhythmData] 리듬 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRhythmData();
  }, [uid, trainingLoad]);

  return {
    rhythmScores,
    loading,
  };
}
