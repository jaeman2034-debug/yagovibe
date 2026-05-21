/**
 * 🔥 팀 가입 요청 관리 페이지 (STEP: 팀원 가입 플로우)
 * 
 * /team/requests 또는 /team/manage/requests
 * 
 * 팀장용 가입 요청 목록 페이지
 * - IdentityHeader: 팀 이름 + "가입 요청 관리"
 * - RequestList: RequestCard × N
 * 
 * ❌ EmptyState 없음
 * ❌ "요청이 없습니다" 강조 ❌
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { RequestList } from "@/components/team/RequestList";
import { TeamMemberList } from "@/components/team/TeamMemberList";
import { DisbandTeamButton } from "@/components/team/DisbandTeamButton";
import { Users, AlertTriangle } from "lucide-react";

export default function TeamJoinRequestsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState<string>("팀");

  // 팀 이름 조회
  useEffect(() => {
    if (!teamId) return;

    const loadTeamName = async () => {
      try {
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          setTeamName(teamData.name || "팀");
        }
      } catch (error) {
        console.warn("[TeamJoinRequestsPage] 팀 이름 조회 실패:", error);
      }
    };

    loadTeamName();
  }, [teamId]);

  const handleDisbanded = () => {
    // 해체 후 /me로 이동 (강제 리다이렉트는 아니지만 자연스러운 흐름)
    navigate("/me");
  };

  if (!teamId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">팀 ID가 필요합니다.</p>
      </div>
    );
  }

  return (
    <HubLayout
      header={
        <IdentityHeader
          title={teamName}
          subtitle="팀 관리"
          meta={
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>가입 요청을 승인하고 팀원을 관리할 수 있습니다</span>
            </div>
          }
        />
      }
      persona={
        <div className="px-4 py-6 space-y-6">
          {/* 가입 요청 목록 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">가입 요청</h2>
            <RequestList teamId={teamId} />
          </div>

          {/* 팀원 목록 (추방 기능) */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">팀원 목록</h2>
            <TeamMemberList teamId={teamId} />
          </div>

          {/* 팀 해체 (팀장만) */}
          <div className="pt-6 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-semibold text-red-900">팀 해체</h3>
              </div>
              <p className="text-sm text-red-700 mb-4">
                팀을 해체하면 모든 팀원이 팀에서 분리됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <DisbandTeamButton
                teamId={teamId}
                teamName={teamName}
                onDisbanded={handleDisbanded}
              />
            </div>
          </div>
        </div>
      }
      // OpportunitySection 없음
    />
  );
}
