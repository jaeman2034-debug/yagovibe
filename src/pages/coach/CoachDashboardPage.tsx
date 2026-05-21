/**
 * 🔥 CoachDashboardPage - 코치 대시보드 페이지
 * 
 * 경로: /coach/dashboard/:teamId
 * 
 * 역할:
 * - 팀 선수 상태 집계
 * - 위험 선수 자동 표시
 * - 코치 판단 정보 제공
 * 
 * UX 목적:
 * - 코치가 선수 상태를 한눈에 파악
 * - 부상 위험 선수 조기 발견
 * - 훈련 강도 조절 판단
 */

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CoachDashboard } from "@/components/coach/CoachDashboard";
import { useTeamMembers } from "@/hooks/useTeamMembers";

/**
 * 🔥 코치 대시보드 페이지
 */
export default function CoachDashboardPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { memberUids, loading: membersLoading } = useTeamMembers(teamId);
  const [teamName, setTeamName] = useState<string>("팀");
  const [loading, setLoading] = useState(true);

  // 🔥 팀 정보 조회
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const loadTeam = async () => {
      try {
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const data = teamSnap.data();
          setTeamName(data.name || "팀");
        }
      } catch (error) {
        console.error("❌ [CoachDashboardPage] 팀 정보 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [teamId]);

  if (loading || membersLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-neutral-500">로딩 중...</div>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">팀 ID가 필요합니다.</div>
      </div>
    );
  }

  return <CoachDashboard playerUids={memberUids} teamName={teamName} />;
}
