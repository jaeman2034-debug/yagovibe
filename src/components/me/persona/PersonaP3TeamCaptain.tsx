/**
 * 🔥 PersonaP3TeamCaptain - 팀장
 * 
 * 현재 MePage.tsx의 "참가 내역" 섹션이 여기로 이동
 */

import { Users, Trophy, Calendar, UserPlus, Building2, Clock, Copy, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaymentButton } from "@/components/tournament/PaymentButton";
import type { PersonaData } from "@/hooks/useMePersona";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";
import { TournamentResultsCard } from "./TournamentResultsCard";
import { TeamRankingCard } from "@/components/ranking/TeamRankingCard";
import { CareerLinkCard } from "@/components/career/CareerLinkCard";
import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useJoinRequests } from "@/hooks/useJoinRequests";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { buildExternalUrl } from "@/lib/growth/teamInviteShare";

interface PersonaP3TeamCaptainProps {
  personaData: PersonaData;
  navigate?: (path: string) => void; // 🔥 optional로 변경 (내부에서 useNavigate 사용)
}

export function PersonaP3TeamCaptain({ personaData, navigate: propNavigate }: PersonaP3TeamCaptainProps) {
  // 🔥 직접 useNavigate 사용 (절대 경로 보장) - propNavigate 무시하고 직접 사용
  const navigate = useNavigate();
  const { teamMembers, teamIds } = useMyTeams(); // 🔥 teamIds도 함께 가져오기
  const { applications } = useMyTournamentApplications();
  
  // 🔥 안전한 teamId 추출 (여러 소스에서 시도)
  const myTeam = teamMembers[0];
  const baseTeamId = myTeam?.teamId || teamIds?.[0] || null;
  
  const [teamDetails, setTeamDetails] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  
  // 🔥 최종 teamId: 우선순위에 따라 결정
  // 1. teamDetails.id (화면에 표시된 실제 팀 ID - 최우선)
  // 2. baseTeamId (useMyTeams에서 가져온 값)
  // 3. myTeam?.teamId (teamMembers[0]의 teamId)
  // 4. myTeam?.id (teamMembers[0]의 id)
  const teamId = teamDetails?.id || baseTeamId || myTeam?.teamId || myTeam?.id || null;
  
  // 🔥 디버깅: teamId 결정 과정 로그
  console.log("[TeamManageNav]", {
    teamId,
    teamDetails: teamDetails ? { id: teamDetails.id, name: teamDetails.name } : null,
    baseTeamId,
    myTeam: myTeam ? { teamId: myTeam.teamId, id: myTeam.id } : null,
  });
  
  // 🔥 가입 요청 조회 (팀장용) - baseTeamId 사용 (teamDetails 로드 전에도 작동)
  const { requests: joinRequests, loading: joinRequestsLoading } = useJoinRequests(baseTeamId || undefined);

  // 팀 상세 정보 조회 (membership 상태 확인용)
  useEffect(() => {
    if (!baseTeamId) {
      setTeamDetails(null);
      setMemberCount(0);
      return;
    }

    console.log("📡 [PersonaP3TeamCaptain] 팀 정보 조회 시작:", baseTeamId);
    const teamRef = doc(db, "teams", baseTeamId);
    const unsubscribe = onSnapshot(teamRef, (snap) => {
      if (snap.exists()) {
        const teamData = snap.data();
        const data = { id: snap.id, ...teamData };
        console.log("✅ [PersonaP3TeamCaptain] 팀 정보 조회 완료:", {
          teamId: data.id,
          name: (teamData as any).name,
          ownerUid: (teamData as any).ownerUid,
        });
        setTeamDetails(data);
      } else {
        console.warn("⚠️ [PersonaP3TeamCaptain] 팀 문서가 존재하지 않음:", baseTeamId);
        setTeamDetails(null);
      }
    }, (error) => {
      console.error("❌ [PersonaP3TeamCaptain] 팀 정보 조회 실패:", error);
      setTeamDetails(null);
    });

    // 🔥 팀원 수 조회
    const membersRef = collection(db, "teams", baseTeamId, "members");
    getDocs(membersRef).then((snap) => {
      setMemberCount(snap.size);
    }).catch((error) => {
      console.error("❌ [PersonaP3TeamCaptain] 팀원 수 조회 실패:", error);
      setMemberCount(0);
    });

    return () => unsubscribe();
  }, [baseTeamId]);
  
  // 🔥 초대 링크 복사
  const handleCopyInviteLink = async () => {
    if (!teamId) return;
    
    try {
      // 초대 링크 생성 (간단 버전: teamId 기반)
      const inviteLink = buildExternalUrl(`/invite/team?teamId=${encodeURIComponent(teamId)}`);
      await navigator.clipboard.writeText(inviteLink);
      toast.success("초대 링크가 복사되었어요!");
    } catch (error) {
      console.error("초대 링크 복사 실패:", error);
      toast.error("초대 링크 복사에 실패했어요.");
    }
  };

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "APPROVED":
        return <Badge variant="default" className="bg-green-500 text-xs">✅ 승인</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="text-xs">❌ 반려</Badge>;
      case "HOLD":
        return <Badge variant="outline" className="text-xs">⏸️ 보류</Badge>;
      case "PENDING":
      default:
        return <Badge variant="secondary" className="text-xs">⏳ 대기</Badge>;
    }
  };

  // 협회 가입 상태 확인
  const hasAssociation = teamDetails?.associationId || teamDetails?.membership === "member";
  const isPending = teamDetails?.membership === "pending";
  const isNonMember = !hasAssociation && !isPending;
  const hasMembers = memberCount > 0;
  const hasPendingJoins = joinRequests.length > 0;

  return (
    <section className="px-4 mt-6 space-y-6">
      {/* 🟦 카드 1: 팀 상태 요약 카드 (항상 최상단, 고정) */}
      {myTeam && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-gray-900">⚽ {teamDetails?.name || teamId}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>팀장</span>
                <span>·</span>
                <span>팀원 {memberCount}명</span>
              </div>
            </div>
            <button
              onClick={() => {
                console.log("teamId:", teamId);
                console.log("navigate:", `/teams/${teamId}/manage`);
                navigate(`/teams/${teamId}/manage`);
              }}
              disabled={!teamId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold"
            >
              팀 관리하기
            </button>
          </div>
        </div>
      )}

      {/* 🟨 카드 2: 협회 가입 카드 (조건부, 가장 중요) */}
      {myTeam && (
        <>
          {/* CASE A: 협회 미가입 */}
          {isNonMember && (
            <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    🏢 아직 협회에 가입하지 않았어요
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    대회·리그·운동장 대관을 이용할 수 있어요
                  </p>
                  <button
                    onClick={() => navigate(`/associations/assoc-nowon-football/apply?teamId=${teamId}`)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    협회 가입하기 →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CASE B: 협회 가입 완료 */}
          {hasAssociation && (
            <div className="bg-white rounded-lg border-2 border-green-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    🏆 노원구 축구협회 소속
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    리그·공지·기록 관리 가능
                  </p>
                  <button
                    onClick={() => navigate(`/federations/nowon-football`)}
                    className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm font-semibold"
                  >
                    협회 페이지 보기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 협회 가입 대기 중 */}
          {isPending && (
            <div className="bg-white rounded-lg border-2 border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    협회 가입 대기 중 ⏳
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    승인되면 알려드릴게요.
                  </p>
                  <p className="text-xs text-gray-500">
                    보통 1~2일 내 확인돼요.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 🟩 카드 3: 팀원 관련 카드 (조건부) */}
      {myTeam && (
        <>
          {/* 가입 요청 있음 */}
          {hasPendingJoins && (
            <div className="bg-white rounded-lg border-2 border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    📩 가입 요청 {joinRequests.length}건
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    확인하고 승인해주세요
                  </p>
                  <button
                    onClick={() => navigate(`/teams/${teamId}/manage?tab=requests`)}
                    className="w-full px-4 py-2 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors text-sm font-semibold"
                  >
                    요청 확인하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 팀원 0명 */}
          {!hasMembers && !hasPendingJoins && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    👥 아직 팀원이 없어요
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    팀원을 초대해보세요
                  </p>
                  <button
                    onClick={handleCopyInviteLink}
                    className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    초대 링크 복사
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 출전 신청 현황 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-semibold text-gray-900">출전 신청 현황</h2>
          </div>
          {applications.length > 0 && (
            <button
              onClick={() => navigate("/me/tournaments")}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              전체 보기 →
            </button>
          )}
        </div>
        
        {applications.length > 0 ? (
          <div className="space-y-2">
            {applications.map((app) => {
              const isApproved = app.status?.toUpperCase() === "APPROVED" || app.status === "approved";
              const rosterStatus = app.rosterStatus || "draft";
              const needsRosterSubmission = isApproved && rosterStatus !== "submitted";

              return (
                <div
                  key={app.id}
                  className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-gray-900">{app.teamName}</div>
                    {getStatusBadge(app.status)}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {app.teamCount}팀 참가
                    {app.feeCalc && ` • ${app.feeCalc.totalFee.toLocaleString()}원`}
                  </div>
                  
                  {/* 승인된 신청에 결제 버튼 + 선수 명단 등록 버튼 */}
                  {isApproved && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                      {/* 결제 버튼 (미결제 시) */}
                      {app.paymentStatus !== "PAID" && app.feeCalc && (
                        <PaymentButton
                          application={app}
                          associationId={app.associationId}
                          tournamentId={app.tournamentId}
                        />
                      )}
                      
                      {/* 선수 명단 버튼 */}
                      {(app.paymentStatus === "PAID" || !app.feeCalc || app.feeCalc.totalFee <= 0) && (
                        <>
                          {needsRosterSubmission ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/me/applications/${app.id}/roster`);
                              }}
                              className="w-full text-sm px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium"
                            >
                              📝 선수 명단 등록하기
                            </button>
                          ) : (
                            <div className="text-xs text-green-600 font-medium">
                              ✅ 선수 명단 제출 완료
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">출전 신청 내역이 없습니다</p>
          </div>
        )}
      </div>

      {/* 선수 관리 */}
      {myTeam && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">선수 관리</h2>
            </div>
            <button
              onClick={() => navigate(`/team/${teamId}/members`)}
              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm font-medium"
            >
              관리하기
            </button>
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">활성 선수:</span> {personaData.teamCount}명
          </div>
        </div>
      )}

      {/* 대회 결과 (STEP: 대회 결과/기록 시스템) */}
      <TournamentResultsCard />

      {/* 팀 랭킹 (STEP: 랭킹/통계 시스템) */}
      <TeamRankingCard />

      {/* 내 커리어 (STEP: 개인 기록 상세 페이지) */}
      <CareerLinkCard />

      {/* 대회 일정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-semibold text-gray-900">대회 일정</h2>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">예정된 일정이 없습니다</p>
        </div>
      </div>
    </section>
  );
}
