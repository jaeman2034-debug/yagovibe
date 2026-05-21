/**
 * 🔥 선수 명단 관리 페이지
 * 
 * 경로: /me/applications/:applicationId/roster
 * 
 * 진입 조건:
 * - 로그인 필수
 * - application.status === "approved"
 * - 현재 유저 === teamManager
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useRoster } from "@/hooks/useRoster";
import { RosterHeader } from "./components/RosterHeader";
import { RosterStatusBanner } from "./components/RosterStatusBanner";
import { PlayerList } from "./components/PlayerList";
import { AddPlayerButton } from "./components/AddPlayerButton";
import { AddPlayerModal } from "./components/AddPlayerModal";
import { RosterFooterActions } from "./components/RosterFooterActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getTournamentApplication } from "@/lib/tournament/applicationRepository";
import type { TournamentApplication } from "@/types/tournament";

export default function RosterPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { roster, players, loading: rosterLoading } = useRoster(applicationId);
  const [application, setApplication] = useState<TournamentApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // 🔥 신청 정보 조회 및 진입 조건 확인
  useEffect(() => {
    if (!applicationId || !user) {
      navigate("/mypage");
      return;
    }

    const loadApplication = async () => {
      try {
        setLoading(true);
        
        // 🔥 v2: collectionGroup으로 application 조회 (applicationId만으로 검색)
        const { collectionGroup, query, where, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        const applicationsQuery = query(
          collectionGroup(db, "applications"),
          where("__name__", "==", applicationId)
        );
        const appsSnap = await getDocs(applicationsQuery);
        
        if (appsSnap.empty) {
          toast.error("참가 신청을 찾을 수 없습니다.");
          navigate("/mypage");
          return;
        }
        
        const appDoc = appsSnap.docs[0];
        const appData = appDoc.data();
        
        // 경로에서 associationId, tournamentId 추출
        const pathParts = appDoc.ref.path.split("/");
        const associationIndex = pathParts.indexOf("associations");
        const tournamentIndex = pathParts.indexOf("tournaments");
        
        if (associationIndex === -1 || tournamentIndex === -1) {
          toast.error("대회 정보를 찾을 수 없습니다.");
          navigate("/mypage");
          return;
        }
        
        const associationId = pathParts[associationIndex + 1];
        const tournamentId = pathParts[tournamentIndex + 1];
        
        // 🔥 진입 조건 확인
        // 1. application.status === "approved"
        const status = appData.status?.toUpperCase();
        if (status !== "APPROVED" && appData.status !== "approved") {
          // 승인 전 상태는 아래에서 처리
        }
        
        // 2. 현재 유저 === teamManager (teamManagerId 또는 createdBy 확인)
        const teamManagerId = appData.teamManagerId || appData.createdBy;
        if (teamManagerId !== user.uid) {
          toast.error("권한이 없습니다.");
          navigate("/mypage");
          return;
        }
        
        setApplication({
          id: applicationId,
          associationId,
          tournamentId,
          ...appData,
        } as TournamentApplication);
      } catch (error) {
        console.error("[선수 명단] 신청 정보 조회 실패:", error);
        toast.error("신청 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [applicationId, user, navigate]);

  // 🔥 승인 전 상태 체크
  if (application && application.status?.toUpperCase() !== "APPROVED") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/mypage")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>

          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-lg font-semibold mb-2">승인 대기 중입니다</h2>
            <p className="text-sm text-gray-600">
              협회 승인 후 선수 명단을 등록할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || rosterLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600">선수 명단 정보를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/mypage")} className="mt-4">
            마이페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const handleAddPlayer = () => {
    setShowAddModal(true);
  };

  const handlePlayerAdded = () => {
    setShowAddModal(false);
    // useRoster가 자동으로 리로드됨
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        {/* 뒤로가기 */}
        <Button
          variant="ghost"
          onClick={() => navigate("/mypage")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>

        {/* 상단 정보 */}
        <RosterHeader roster={roster} />

        {/* 상태 배너 */}
        <RosterStatusBanner rosterStatus={roster.rosterStatus} />

        {/* 선수 리스트 */}
        <PlayerList
          players={players}
          editable={roster.rosterStatus === "draft"}
          applicationId={applicationId!}
        />

        {/* 선수 추가 버튼 */}
        {roster.rosterStatus === "draft" && (
          <AddPlayerButton onClick={handleAddPlayer} />
        )}

        {/* 하단 액션 */}
        <RosterFooterActions
          rosterStatus={roster.rosterStatus}
          playerCount={players.length}
          applicationId={applicationId!}
          associationId={application?.associationId}
          tournamentId={application?.tournamentId}
        />

        {/* 선수 추가 모달 */}
        {showAddModal && (
          <AddPlayerModal
            onClose={() => setShowAddModal(false)}
            onSave={handlePlayerAdded}
            applicationId={applicationId!}
          />
        )}
      </div>
    </div>
  );
}
