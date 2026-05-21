/**
 * 🔥 SelectTeamPage - 팀 선택 페이지
 * 
 * 역할:
 * - team_members 1쿼리로 내가 속한 팀 목록 표시
 * - 팀 클릭 → 즉시 이동 (상태 의존 ❌ / URL 기반 ⭕️)
 * - 팀 기억 우선순위:
 *   1. URL teamId
 *   2. localStorage currentTeamId
 *   3. users.lastTeamId
 *   4. team_members 첫 팀
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { AppSkeleton } from "@/components/onboarding/AppSkeleton";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft } from "lucide-react";

export default function SelectTeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teamMembers, loading, hasTeams } = useMyTeams();
  const [lastTeamId, setLastTeamId] = useState<string | null>(null);
  const [loadingLastTeam, setLoadingLastTeam] = useState(true);

  // 🔥 마지막 접속 팀 조회 (users/{uid}.lastTeamId)
  useEffect(() => {
    if (!user?.uid) {
      setLoadingLastTeam(false);
      return;
    }

    const fetchLastTeam = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setLastTeamId(userData.lastTeamId || null);
        }
      } catch (err) {
        console.error("❌ [SelectTeamPage] 마지막 팀 조회 실패:", err);
      } finally {
        setLoadingLastTeam(false);
      }
    };

    fetchLastTeam();
  }, [user?.uid]);

  // 🔥 팀 선택 핸들러
  const handleSelectTeam = (teamId: string) => {
    // localStorage에 저장
    localStorage.setItem("currentTeamId", teamId);
    
    // 즉시 이동 (상태 의존 ❌ / URL 기반 ⭕️)
    navigate(`/team/${teamId}`, { replace: true });
  };

  // 🔥 권장 팀 ID (우선순위)
  const recommendedTeamId = 
    lastTeamId || 
    localStorage.getItem("currentTeamId") ||
    teamMembers[0]?.teamId ||
    null;

  if (loading || loadingLastTeam) {
    return <AppSkeleton />;
  }

  // 팀 없음 → 온보딩으로
  if (!hasTeams || teamMembers.length === 0) {
    navigate("/sports/soccer/team/create", { replace: true });
    return null;
  }

  // 팀 1개만 있으면 자동 선택
  if (teamMembers.length === 1) {
    handleSelectTeam(teamMembers[0].teamId);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/sports-hub")}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft size={20} />
            <span>허브로 이동</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            팀 선택
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            접속할 팀을 선택하세요
          </p>
        </div>

        {/* 팀 목록 */}
        <div className="space-y-3">
          {teamMembers.map((member) => {
            const isRecommended = member.teamId === recommendedTeamId;
            
            return (
              <button
                key={member.id}
                onClick={() => handleSelectTeam(member.teamId)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isRecommended
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        팀 {member.teamId.slice(0, 8)}
                      </span>
                      {isRecommended && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          마지막 접속
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      역할: {member.role === "owner" ? "팀장" : member.role === "admin" ? "관리자" : "멤버"}
                    </div>
                  </div>
                  <div className="text-blue-600 dark:text-blue-400">
                    →
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 팀 만들기 CTA */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => navigate("/sports/soccer/team/create")}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            + 새 팀 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
