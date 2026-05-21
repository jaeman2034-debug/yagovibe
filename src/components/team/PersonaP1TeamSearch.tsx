/**
 * 🔥 PersonaP1TeamSearch - P1 전용 팀 탐색 섹션 (STEP: 팀원 가입 플로우)
 * 
 * PersonaSection에 들어갈 컴포넌트
 * - TeamList (FilterBar 포함)
 * - 팀 만들기 버튼
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useMyProfile } from "@/hooks/useMyProfile";
import { TeamList } from "./TeamList";
import { createTeamSimple } from "@/lib/team/createTeamSimple";
import { resolveTeamSearchFilterSportType } from "@/lib/team/teamSearchQuery";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PersonaP1TeamSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useMyProfile();
  const [creating, setCreating] = useState(false);

  const filterSportType = resolveTeamSearchFilterSportType(searchParams);

  // 🔥 협회 카드 표시 여부 (축구만 — URL sport=soccer 등도 football로 귀결)
  const showAssociationCard =
    filterSportType === "football" || filterSportType === "futsal";

  const handleCreateTeam = async () => {
    if (!user?.uid) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!profile?.sport || !profile?.region) {
      alert("프로필에 종목과 지역 정보가 필요합니다.");
      navigate("/profile/setup");
      return;
    }

    const teamName = prompt("팀 이름을 입력하세요:");
    if (!teamName || !teamName.trim()) {
      return;
    }

    setCreating(true);
    try {
      const teamId = await createTeamSimple({
        name: teamName.trim(),
        sport: profile.sport,
        region: profile.region,
        ownerUid: user.uid, // 🔥 v1: leaderId → ownerUid로 통일
        authUser: user,
      });

      console.log("✅ [PersonaP1TeamSearch] 팀 생성 성공:", teamId);
      
      // 팀 생성 성공 → 팀 상세 페이지로 이동
      // Persona는 자동으로 P1 → P3 전이됨
      const qs = user.isAnonymous ? "?onboarding=1&linkAccount=1" : "";
      navigate(`/team/${teamId}${qs}`);
    } catch (error: any) {
      console.error("❌ [PersonaP1TeamSearch] 팀 생성 실패:", error);
      alert(`팀 생성에 실패했습니다: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 🔥 협회 카드 (팀 찾기 내부로 통합) */}
      {showAssociationCard && (
        <div className="px-4 pt-4">
          <button
            type="button"
            aria-label="노원구 축구협회 공식 페이지 열기"
            onClick={() => navigate("/federations/nowon-football")}
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-gray-300 bg-white p-6 shadow-md transition hover:shadow-lg active:scale-[0.99] motion-safe:hover:scale-[1.02] dark:border-gray-600 dark:bg-gray-900"
          >
            <span className="mb-2 text-3xl" aria-hidden>
              🏛️
            </span>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">
              노원구 축구협회
            </span>
            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              공식 협회 페이지 · 대회 · 공지 · 대관 — 탭하여 이동
            </span>
          </button>
        </div>
      )}

      {/* 팀 만들기 버튼 */}
      <div className="px-4 pt-4">
        <Button
          onClick={handleCreateTeam}
          disabled={creating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          {creating ? "팀 생성 중..." : "팀 만들기"}
        </Button>
      </div>

      {/* 팀 목록 */}
      <TeamList />
    </div>
  );
}
