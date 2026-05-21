/**
 * TeamManagementMain
 * 우리 팀 관리 메인 페이지
 * 
 * 협회 중심 구조에서 사용자의 위치를 보여주는 화면
 * 1. 조직 컨텍스트 바 (협회 소속 여부)
 * 2. 운동장 대관 현황 카드 (가장 중요)
 * 3. 내 팀 카드 (있는 경우/없는 경우)
 * 4. 협회 영역 (권한 있을 때만)
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import OrganizationContextBar from "@/components/team/OrganizationContextBar";
import FacilityBookingStatusCard from "@/components/team/FacilityBookingStatusCard";
import { Button } from "@/components/ui/button";
import { Users, Plus, UserPlus, Settings, Building2 } from "lucide-react";

export default function TeamManagementMain() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam, loading: teamLoading } = useTeam();
  const [teamAssociationId, setTeamAssociationId] = useState<string | undefined>();
  const [teamStatus, setTeamStatus] = useState<"MEMBER" | "NON_MEMBER" | "ACADEMY" | undefined>();

  // 팀의 협회 정보 조회
  useEffect(() => {
    const fetchTeamAssociation = async () => {
      if (!myTeam?.id) {
        setTeamAssociationId(undefined);
        setTeamStatus(undefined);
        return;
      }

      try {
        const teamDoc = await getDoc(doc(db, "teams", myTeam.id));
        if (teamDoc.exists()) {
          const teamData = teamDoc.data();
          setTeamAssociationId(teamData.associationId);
          setTeamStatus(teamData.status as "MEMBER" | "NON_MEMBER" | "ACADEMY");
        }
      } catch (error) {
        console.error("팀 협회 정보 조회 실패:", error);
      }
    };

    fetchTeamAssociation();
  }, [myTeam?.id]);

  // 로딩 중
  if (teamLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <OrganizationContextBar />
        <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 1. 조직 컨텍스트 바 (고정 상단) */}
      <OrganizationContextBar
        teamId={myTeam?.id}
        teamAssociationId={teamAssociationId}
      />

      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6 space-y-6">
        {/* 2. 운동장 대관 현황 카드 (가장 위, 가장 큼) */}
        <FacilityBookingStatusCard
          associationId={teamAssociationId || "assoc-nowon-football"}
          teamId={myTeam?.id}
          teamStatus={teamStatus}
        />

        {/* 3. 내 팀 상태 카드 */}
        {myTeam ? (
          // A. 내 팀이 있는 경우
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {myTeam.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {teamStatus === "MEMBER"
                        ? "회원팀"
                        : teamStatus === "ACADEMY"
                        ? "아카데미"
                        : "비회원팀"}
                    </span>
                    {teamAssociationId && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        협회 소속
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/sports/${type}/team/dashboard`)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                팀 관리
              </Button>
            </div>
          </div>
        ) : (
          // B. 내 팀이 없는 경우
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                아직 내 팀이 없습니다
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                어떤 방식으로 팀에 참여하시겠어요?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                팀을 생성하거나, 기존 팀에 합류할 수 있습니다
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate(`/sports/${type}/team/create`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  팀 만들기
                </Button>
                <Button
                  onClick={() => navigate(`/teams/search?type=${type}`)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  기존 팀 합류 요청
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                💡 새로 만든 팀은 기본적으로 비회원팀입니다. 협회에 가입하려면 회원 전환 문의가 필요합니다.
              </p>
            </div>
          </div>
        )}

        {/* 4. 협회 영역 (권한 있을 때만) */}
        {teamAssociationId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                협회 운영
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              협회 관리자 권한이 있는 경우에만 표시됩니다.
            </p>
            <Button
              onClick={() => navigate(`/association/${teamAssociationId}`)}
              variant="outline"
              className="w-full"
            >
              협회 홈으로 이동
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

