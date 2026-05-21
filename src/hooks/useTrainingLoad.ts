/**
 * 🔥 useTrainingLoad - 훈련 부하 계산 훅
 * 
 * 역할:
 * - 최근 3일 활동량 계산
 * - 최근 14일 평균 활동량 계산
 * - 훈련 부하 비율 계산
 * 
 * UX 목적:
 * - 과부하 감지
 * - 훈련 조절 시스템
 */

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 🔥 훈련 부하 데이터
 */
export interface TrainingLoad {
  recent3Days: number; // 최근 3일 활동량 (분)
  avg14Days: number; // 최근 14일 평균 활동량 (분)
  loadRatio: number; // 부하 비율 (recent3Days / avg14Days)
  status: "low" | "normal" | "high" | "danger"; // 부하 상태
}

/**
 * 🔥 날짜 범위 계산
 */
function getDateRange(daysBack: number): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  
  return { start, end };
}

/**
 * 🔥 훈련 부하 조회 훅
 * 
 * @param uid 사용자 UID
 * @returns 훈련 부하 데이터, 로딩 상태
 */
export function useTrainingLoad(uid?: string) {
  const [load, setLoad] = useState<TrainingLoad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const loadTrainingData = async () => {
      try {
        setLoading(true);

        // 🔥 최근 14일 활동 기록 조회
        const { start, end } = getDateRange(14);
        const q = query(
          collection(db, "activityHistory"),
          where("uid", "==", uid),
          where("endedAt", ">=", Timestamp.fromDate(start)),
          where("endedAt", "<=", Timestamp.fromDate(end))
        );

        const snap = await getDocs(q);
        const now = new Date();

        // 🔥 최근 3일 날짜 범위
        const recent3Start = new Date();
        recent3Start.setDate(now.getDate() - 3);
        recent3Start.setHours(0, 0, 0, 0);

        let recent3Days = 0;
        let total14Days = 0;
        let count14Days = 0;

        snap.docs.forEach((doc) => {
          const data = doc.data();
          const endedAt = data.endedAt?.toDate?.() || (data.endedAt?.seconds ? new Date(data.endedAt.seconds * 1000) : null);
          
          if (!endedAt) return;

          const durationMin = Math.floor((data.durationMs || 0) / 60000);
          
          // 🔥 최근 3일 포함 여부
          if (endedAt >= recent3Start) {
            recent3Days += durationMin;
          }

          // 🔥 최근 14일 합계
          total14Days += durationMin;
          count14Days += 1;
        });

        // 🔥 최근 14일 평균 계산
        const avg14Days = count14Days > 0 ? total14Days / count14Days : 0;
        
        // 🔥 부하 비율 계산 (평균 대비)
        const loadRatio = avg14Days > 0 ? recent3Days / avg14Days : 0;

        // 🔥 부하 상태 판단
        let status: "low" | "normal" | "high" | "danger" = "normal";
        if (loadRatio < 0.7) {
          status = "low";
        } else if (loadRatio >= 0.7 && loadRatio < 1.2) {
          status = "normal";
        } else if (loadRatio >= 1.2 && loadRatio < 1.6) {
          status = "high";
        } else {
          status = "danger";
        }

        setLoad({
          recent3Days,
          avg14Days,
          loadRatio,
          status,
        });
      } catch (error) {
        console.error("❌ [useTrainingLoad] 훈련 부하 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTrainingData();
  }, [uid]);

  return {
    load,
    loading,
  };
}
