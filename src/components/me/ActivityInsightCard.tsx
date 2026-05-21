/**
 * 🔥 ActivityInsightCard - 활동 통계 카드
 * 
 * 역할:
 * - 개인 통계 정보 표시
 * - 이번 주 중 몇 번째 운동
 * - 평균 대비 분석
 * - 최근 7일 활동 중 하나
 * 
 * UX 목적:
 * - 사용자에게 "의미"를 보여줌
 * - 기록 해석 제공
 * - 서비스 퀄리티 향상
 */

import { TrendingUp, Calendar, Target } from "lucide-react";
import { useActivityStats, type ActivityStats } from "@/hooks/useActivityStats";
import { useAuth } from "@/context/AuthProvider";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Props = {
  currentDurationMs: number;
  endedAt: any;
};

/**
 * 🔥 ActivityInsightCard 컴포넌트
 */
export function ActivityInsightCard({ currentDurationMs, endedAt }: Props) {
  const { user } = useAuth();
  const stats = useActivityStats(user?.uid);
  const [weekRank, setWeekRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !endedAt) {
      setLoading(false);
      return;
    }

    const calculateWeekRank = async () => {
      try {
        // 🔥 이번 주 시작 시간 계산
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // 🔥 이번 주 모든 기록 조회
        const q = query(
          collection(db, "activityHistory"),
          where("uid", "==", user.uid),
          where("endedAt", ">=", Timestamp.fromDate(weekStart))
        );

        const snap = await getDocs(q);
        const sessions = snap.docs
          .map((d) => {
            const data = d.data();
            let endDate: Date | null = null;
            if (data.endedAt) {
              if (data.endedAt.toDate && typeof data.endedAt.toDate === "function") {
                endDate = data.endedAt.toDate();
              } else if (data.endedAt.seconds) {
                endDate = new Date(data.endedAt.seconds * 1000);
              }
            }
            return { id: d.id, endedAt: endDate, durationMs: data.durationMs || 0 };
          })
          .filter((s) => s.endedAt)
          .sort((a, b) => (b.endedAt?.getTime() || 0) - (a.endedAt?.getTime() || 0));

        // 🔥 현재 세션이 이번 주 중 몇 번째인지 계산
        const currentEndDate = endedAt?.toDate?.() || (endedAt?.seconds ? new Date(endedAt.seconds * 1000) : null);
        if (currentEndDate) {
          const rank = sessions.findIndex((s) => {
            const sDate = s.endedAt;
            return sDate && Math.abs(sDate.getTime() - currentEndDate.getTime()) < 1000;
          });
          setWeekRank(rank >= 0 ? rank + 1 : null);
        }
      } catch (err) {
        console.error("❌ [ActivityInsightCard] 주간 순위 계산 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    calculateWeekRank();
  }, [user?.uid, endedAt]);

  const currentDurationMin = Math.floor(currentDurationMs / 60000);
  // 🔥 평균 계산: 이번 주 총 시간 / 이번 주 횟수 (현재 세션 제외)
  const weekCountExcludingCurrent = stats.weekCount > 0 ? stats.weekCount - 1 : 0;
  const weekMinExcludingCurrent = stats.weekMin - currentDurationMin;
  const avgDurationMin = weekCountExcludingCurrent > 0 
    ? Math.floor(weekMinExcludingCurrent / weekCountExcludingCurrent) 
    : 0;
  const diffMin = currentDurationMin - avgDurationMin;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <h3 className="font-semibold mb-4 text-sm text-neutral-700">개인 통계</h3>
        <div className="text-sm text-neutral-500">계산 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
      <h3 className="font-semibold mb-4 text-sm text-neutral-700">개인 통계</h3>
      <div className="space-y-3">
        {weekRank !== null && weekRank > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Calendar className="w-4 h-4" />
              <span>이번 주</span>
            </div>
            <span className="text-sm font-medium text-neutral-800">
              {weekRank}번째 운동
            </span>
          </div>
        )}
        {avgDurationMin > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <TrendingUp className="w-4 h-4" />
              <span>평균 대비</span>
            </div>
            <span
              className={`text-sm font-semibold ${
                diffMin > 0 ? "text-green-600" : diffMin < 0 ? "text-orange-600" : "text-neutral-600"
              }`}
            >
              {diffMin > 0 ? "+" : ""}
              {diffMin}분
            </span>
          </div>
        )}
        {stats.weekCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Target className="w-4 h-4" />
              <span>이번 주 활동</span>
            </div>
            <span className="text-sm font-medium text-neutral-800">
              {stats.weekCount}회 · {stats.weekMin}분
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
