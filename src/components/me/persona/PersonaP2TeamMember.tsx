/**
 * 🔥 PersonaP2TeamMember - 팀 소속 선수
 */

import { useState, useEffect } from "react";
import { Users, Trophy, Calendar, LogOut, CheckCircle, Building2, Info, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import type { PersonaData } from "@/hooks/useMePersona";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";
import { leaveTeam } from "@/lib/team/teamLeave";
import { TournamentResultsCard } from "./TournamentResultsCard";
import { TeamRankingCard } from "@/components/ranking/TeamRankingCard";
import { CareerLinkCard } from "@/components/career/CareerLinkCard";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";

interface PersonaP2TeamMemberProps {
  personaData: PersonaData;
  navigate: (path: string) => void;
}

export function PersonaP2TeamMember({ personaData, navigate }: PersonaP2TeamMemberProps) {
  const { user } = useAuth();
  const { teamMembers, teamIds } = useMyTeams(); // 🔥 teamIds도 함께 가져오기
  const { applications } = useMyTournamentApplications();
  const [leaving, setLeaving] = useState(false);
  const [isViceCaptain, setIsViceCaptain] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{ 
    name?: string; 
    region?: string; 
    sportType?: string;
    associationId?: string | null;
    membership?: string;
  } | null>(null);
  
  // 첫 번째 팀 정보
  const myTeam = teamMembers[0];
  // 🔥 안전한 teamId 추출 (여러 소스에서 시도)
  const teamId = myTeam?.teamId || teamIds?.[0] || null;
  
  // 🔥 디버깅: useMyTeams 반환값 확인
  console.log("🔍 [PersonaP2TeamMember] useMyTeams 반환값:", {
    teamMembers,
    teamIds,
    myTeam,
    teamId,
    hasTeamId: !!teamId,
  });

  // 팀 상세 정보 조회 (실시간)
  useEffect(() => {
    if (!teamId) {
      setTeamInfo(null);
      return;
    }

    const teamRef = doc(db, 'teams', teamId);
    const unsubscribe = onSnapshot(teamRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTeamInfo({
          name: data.name,
          region: data.region,
          sportType: data.sportType,
          associationId: data.associationId || null,
          membership: data.membership || data.status || 'non-member',
        });
      } else {
        setTeamInfo(null);
      }
    }, (error) => {
      console.error('팀 정보 조회 실패:', error);
      setTeamInfo(null);
    });

    return () => unsubscribe();
  }, [teamId]);

  // 부팀장 권한 확인
  useEffect(() => {
    if (!teamId || !user?.uid) {
      setIsViceCaptain(false);
      return;
    }

    const memberRef = doc(db, 'teams', teamId, 'members', user.uid);
    const unsubscribe = onSnapshot(memberRef, (snap) => {
      if (snap.exists()) {
        const memberData = snap.data();
        const role = memberData.role;
        const accessLevel = memberData.accessLevel;
        const isVice = 
          role === 'vice' || 
          role === '부팀장' ||
          accessLevel === 'ADMIN';
        setIsViceCaptain(isVice);
      } else {
        setIsViceCaptain(false);
      }
    }, (error) => {
      console.error('부팀장 권한 확인 실패:', error);
      setIsViceCaptain(false);
    });

    return () => unsubscribe();
  }, [teamId, user?.uid]);

  const participations = applications.filter(app => app.status === "APPROVED");

  const handleLeaveTeam = async () => {
    if (!user || !teamId) return;
    
    if (!confirm("정말 팀을 탈퇴하시겠습니까?")) {
      return;
    }

    setLeaving(true);
    try {
      await leaveTeam(teamId, user.uid);
      // 탈퇴 후 자동으로 Persona가 P1로 전이됨 (새로고침 필요)
      // 강제 리다이렉트 없음 - 상태 변화가 피드백
    } catch (error: any) {
      console.error("[PersonaP2TeamMember] 탈퇴 실패:", error);
      alert(error.message || "탈퇴에 실패했습니다.");
    } finally {
      setLeaving(false);
    }
  };

  // 협회 소속 여부 확인
  const hasAssociation = teamInfo?.associationId != null;
  const isPending = teamInfo?.membership === 'pending';

  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 1️⃣ P2 전용 상단 카드 (정체성 고정) */}
      {myTeam && (
        <div className="bg-white rounded-lg border-2 border-blue-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">내 팀</h2>
              <div className="flex items-center gap-2 mt-1">
                {isViceCaptain ? (
                  <Badge variant="default" className="text-xs bg-purple-600 text-white flex items-center gap-1">
                    <Shield className="w-3 h-3" /> 부팀장
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    팀원
                  </Badge>
                )}
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  팀에 합류했어요 🎉
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            {teamInfo?.name && (
              <div className="text-base font-semibold text-gray-900">
                {teamInfo.name}
              </div>
            )}
            {teamInfo?.region && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">지역:</span> {teamInfo.region}
              </div>
            )}
            {teamInfo?.sportType && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">종목:</span> {teamInfo.sportType}
              </div>
            )}
          </div>

          {/* 2️⃣ 팀 활동 CTA (팀원이 할 수 있는 것만) */}
          <div className="space-y-2 mb-4">
            {isViceCaptain ? (
              <button
                onClick={() => navigate(`/teams/${myTeam.teamId}/manage`)}
                className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                팀 관리하기
              </button>
            ) : (
              <button
                onClick={() => {
                  // 🔥 디버깅: teamId 확인
                  console.log("🔍 [PersonaP2TeamMember] 팀 정보 보기 클릭:", {
                    myTeam,
                    teamId,
                    hasTeamId: !!teamId,
                  });
                  
                  if (!teamId) {
                    console.error("❌ [PersonaP2TeamMember] teamId가 없습니다:", { myTeam, teamIds });
                    alert("팀 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.");
                    return;
                  }
                  
                  navigate(`/teams/${encodeURIComponent(teamId)}/play`);
                }}
                disabled={!teamId}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
              >
                팀 정보 보기
              </button>
            )}
            
            {hasAssociation && (
              <button
                onClick={() => teamInfo?.associationId && navigate(`/association/${teamInfo.associationId}`)}
                className="w-full px-4 py-2.5 bg-white border-2 border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                협회 소식 보기
              </button>
            )}
          </div>

          <button
            onClick={handleLeaveTeam}
            disabled={leaving}
            className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {leaving ? "처리 중..." : "팀 탈퇴"}
          </button>
        </div>
      )}

      {/* 3️⃣ 상태 안내 (협회 미가입 팀) */}
      {myTeam && !hasAssociation && !isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                협회 가입 대기 중
              </p>
              <p className="text-xs text-blue-700">
                현재 팀이 협회에 가입되어 있지 않아요.<br />
                팀장이 가입을 완료하면 공식 활동이 열려요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 협회 가입 승인 대기 중 */}
      {myTeam && isPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-1">
                협회 가입 승인 대기 중
              </p>
              <p className="text-xs text-yellow-700">
                팀장이 협회 가입을 신청했어요.<br />
                승인되면 공식 활동이 시작돼요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 출전 현황 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-semibold text-gray-900">출전 현황</h2>
        </div>
        {participations.length > 0 ? (
          <div className="space-y-2">
            {participations.map((app) => (
              <div key={app.id} className="text-sm text-gray-700">
                {app.teamName} - {app.status}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">출전 중인 대회가 없습니다</p>
          </div>
        )}
      </div>

      {/* 대회 결과 (STEP: 대회 결과/기록 시스템) */}
      <TournamentResultsCard />

      {/* 팀 랭킹 (STEP: 랭킹/통계 시스템) */}
      <TeamRankingCard />

      {/* 내 커리어 (STEP: 개인 기록 상세 페이지) */}
      <CareerLinkCard />

      {/* 다가오는 경기 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-semibold text-gray-900">다가오는 경기</h2>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">예정된 경기가 없습니다</p>
        </div>
      </div>
    </section>
  );
}
