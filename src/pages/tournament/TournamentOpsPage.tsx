/**
 * 🔥 대회 운영 대시보드 (ops)
 * Phase 1-2: 현장 운영 핵심 화면
 * 
 * 경로: /association/:associationId/admin/tournaments/:tournamentId/ops
 * 
 * 구조:
 * 1. 대회 상태 요약 (참가 신청, 검수, 조 추첨, 경기 생성)
 * 2. 운영 액션 (조 추첨 실행, 경기 자동 생성, 경기장별 일정표 관리)
 * 3. 운영 로그 (누가/언제/무엇을 실행했는지)
 * 4. 경기장별 일정표 (하위 섹션)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { isTestModeFromURL } from "@/lib/tournament/testModeUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, AlertCircle, Lock } from "lucide-react";
import { getMatches, getVenues, getTournament, isTournamentLocked } from "@/lib/tournament/tournamentRepository";
import type { MatchOps, VenueOps, Tournament } from "@/types/tournament";
import { EndTournamentButton } from "@/components/tournament/EndTournamentButton";
import { isAdmin } from "@/lib/tournament/refereeRoleRepository";
import { TournamentStatusSummary } from "@/components/tournament/TournamentStatusSummary";
import { TournamentOpsActions } from "@/components/tournament/TournamentOpsActions";
import { TournamentOpsLog } from "@/components/tournament/TournamentOpsLog";
import { GovernmentPDFGenerator } from "@/components/tournament/GovernmentPDFGenerator";
import { TestTeamGenerator } from "@/components/tournament/TestTeamGenerator";
import { TournamentTeamsManagement } from "@/components/tournament/TournamentTeamsManagement";
import { useTournamentTeamsSnapshot } from "@/hooks/useTournamentTeamsSnapshot";
import { TeamsSnapshotModal } from "@/components/tournament/TeamsSnapshotModal";

export default function TournamentOpsPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTestMode = isTestModeFromURL() || searchParams.get("mode") === "test"; // 🔥 테스트 모드 감지
  
  const [venues, setVenues] = useState<VenueOps[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchOps[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // 🔥 에러 상태 추가
  const [isLocked, setIsLocked] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [tournamentName, setTournamentName] = useState<string>("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teamsRefreshTrigger, setTeamsRefreshTrigger] = useState(0); // 🔥 팀 목록 새로고침 트리거
  const [showTeamsView, setShowTeamsView] = useState(false); // 🔥 팀 보기 모달 상태

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin();
      setIsUserAdmin(admin);
    };
    checkAdmin();
  }, []);
  
  // 🔥 참가팀 스냅샷 실시간 구독 (Hook 사용)
  const { teams: teamsSnapshot, loading: teamsSnapshotLoading } = useTournamentTeamsSnapshot(
    associationId,
    tournamentId
  );

  // 🔥 액션 성공 핸들러 (팀 생성, 조 추첨 등 실행 후 호출)
  const handleActionSuccess = async () => {
    console.log("[TournamentOpsPage] 액션 성공 - 상태 새로고침 시작");
    
    // 1. 대회 정보 재로드 (조 추첨 버튼 활성화를 위해)
    await reloadTournament();
    
    // 2. 팀 목록 새로고침 (참가팀 관리 섹션 업데이트)
    setTeamsRefreshTrigger(prev => prev + 1);
    
    console.log("[TournamentOpsPage] 상태 새로고침 완료");
  };

  // 🔥 대회 정보 재로드 함수 (팀 생성 후 호출용)
  const reloadTournament = async () => {
    if (!associationId || !tournamentId) return;
    
    try {
      console.log("[TournamentOpsPage] 대회 정보 재로드 시작");
      const tournamentData = await getTournament(associationId, tournamentId);
      if (tournamentData) {
        setTournament(tournamentData);
        setTournamentName(tournamentData.name);
        console.log("[TournamentOpsPage] 대회 정보 재로드 완료", {
          tournamentId: tournamentData.id,
          drawExecuted: tournamentData.drawExecuted,
        });
      }
      const locked = await isTournamentLocked(associationId, tournamentId);
      setIsLocked(locked);
    } catch (error: any) {
      console.error("❌ [TournamentOpsPage] 대회 정보 재로드 오류:", error);
      setError(error?.message || "대회 정보를 불러오는 중 오류가 발생했습니다.");
    }
  };

  // 대회 정보 및 Lock 상태 확인
  useEffect(() => {
    if (!associationId || !tournamentId) {
      setLoading(false);
      return;
    }
    
    const loadTournament = async () => {
      try {
        setLoading(true);
        const tournamentData = await getTournament(associationId, tournamentId);
        if (tournamentData) {
          setTournament(tournamentData);
          setTournamentName(tournamentData.name);
        }
        const locked = await isTournamentLocked(associationId, tournamentId);
        setIsLocked(locked);
      } catch (error: any) {
        console.error("❌ [TournamentOpsPage] 대회 정보 로드 오류:", error);
        // 에러 발생 시에도 UI는 계속 동작할 수 있도록 설정
        setTournamentName("대회 정보를 불러올 수 없습니다");
        setIsLocked(false);
        setError(error?.message || "대회 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        // 🔥 반드시 로딩 해제 (성공/실패 관계없이)
        setLoading(false);
      }
    };
    
    loadTournament();
  }, [associationId, tournamentId]); // ✅ ID만 dependency (객체 아님)

  // 경기장 목록 로드
  useEffect(() => {
    if (!associationId || !tournamentId) {
      setVenues([]);
      return;
    }
    
    const loadVenues = async () => {
      try {
        const venuesList = await getVenues(associationId, tournamentId);
        setVenues(venuesList);
        if (venuesList.length > 0 && !selectedVenueId) {
          setSelectedVenueId(venuesList[0].id);
        }
      } catch (error) {
        console.error("❌ [TournamentOpsPage] 경기장 로드 오류:", error);
        setVenues([]); // 에러 시 빈 배열로 설정
      }
    };
    
    loadVenues();
  }, [associationId, tournamentId, selectedVenueId]); // ✅ ID만 dependency

  // 경기 목록 로드
  useEffect(() => {
    if (!associationId || !tournamentId || !selectedVenueId) {
      setMatches([]);
      setLoading(false);
      return;
    }
    
    const loadMatches = async () => {
      try {
        setLoading(true);
        if (isTestMode) {
          // 🔥 테스트 모드: test_matches 조회
          const { getTestMatches } = await import("@/lib/tournament/testModeUtils");
          const testMatches = await getTestMatches(associationId, tournamentId);
          // 필터링 (venueId, date)
          const filtered = testMatches.filter((m: any) => {
            if (selectedVenueId && m.venueId !== selectedVenueId) return false;
            if (selectedDate && m.date !== selectedDate) return false;
            return true;
          });
          setMatches(filtered as MatchOps[]);
        } else {
          // 🔥 운영 모드: 기존 로직
          const matchesList = await getMatches(associationId, tournamentId, {
            venueId: selectedVenueId,
            date: selectedDate,
          });
          setMatches(matchesList);
        }
      } catch (error) {
        console.error("❌ [TournamentOpsPage] 경기 로드 오류:", error);
        setMatches([]); // 에러 시 빈 배열로 설정
      } finally {
        // 🔥 반드시 로딩 해제 (성공/실패 관계없이)
        setLoading(false);
      }
    };
    
    loadMatches();
  }, [associationId, tournamentId, selectedVenueId, selectedDate, isTestMode]); // ✅ 테스트 모드 추가

  const handleMatchClick = (matchId: string) => {
    navigate(
      `/association/${associationId}/admin/tournaments/${tournamentId}/matches/${matchId}`
    );
  };

  const getStatusBadge = (status: MatchOps["status"]) => {
    const badges = {
      WAIT: { text: "대기", color: "bg-gray-100 text-gray-800" },
      LIVE: { text: "진행 중", color: "bg-green-100 text-green-800" },
      END: { text: "종료", color: "bg-blue-100 text-blue-800" },
      CANCELLED: { text: "취소", color: "bg-red-100 text-red-800" },
    };
    const badge = badges[status] || badges.WAIT;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  // 🔥 클릭 이벤트 디버깅
  useEffect(() => {
    console.log("🔥 [TournamentOpsPage] 페이지 로드:", {
      associationId,
      tournamentId,
      hasParams: !!(associationId && tournamentId),
    });
  }, [associationId, tournamentId]);

  if (!associationId || !tournamentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            대회 정보를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 mb-4">
            URL을 확인해주세요.
          </p>
          <Button onClick={() => navigate(-1)}>
            이전 페이지로
          </Button>
        </div>
      </div>
    );
  }

  // 🔥 에러 상태 UI
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            오류가 발생했습니다
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              새로고침
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              이전 페이지로
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => navigate(`/association/${associationId}/admin/tournaments`)}
                className="text-blue-600 hover:text-blue-800 mb-2 text-sm flex items-center gap-1"
              >
                ← 대회 목록
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {tournamentName || "대회 운영 대시보드"}
                  {isTestMode && <span className="ml-2 text-sm text-orange-600">(테스트 모드)</span>}
                  {tournament?.drawExecuted && !isTestMode && (
                    <span className="ml-2 text-sm text-green-600">✅ 공식 확정</span>
                  )}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {tournament?.drawExecuted && !isTestMode
                    ? "본 대회는 공식 조 추첨 및 대진표가 확정되었습니다. 이후 수정은 이력으로 관리됩니다."
                    : "대회 운영 상태를 확인하고 필요한 작업을 진행하세요."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 🔥 참가팀 보기 버튼 (상단 우측) */}
              <button
                onClick={() => setShowTeamsView(true)}
                className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
              >
                👥 참가팀 보기
              </button>
              {isTestMode && (
                <div className="bg-orange-100 border border-orange-300 rounded-lg px-4 py-2">
                  <p className="text-sm font-semibold text-orange-900">
                    ⚠️ 테스트 모드
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    운영 기록 미반영
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              {/* 🔒 대회 종료 버튼 (관리자 전용) */}
              {isUserAdmin && !isLocked && (
                <EndTournamentButton
                  associationId={associationId!}
                  tournamentId={tournamentId!}
                />
              )}
            </div>
          </div>
          
          {/* 🔒 대회 종료 상태 배지 */}
          {isLocked && (
            <Card className="mb-4 border-yellow-300 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Lock className="w-5 h-5" />
                  <span className="font-semibold">대회가 종료되어 모든 기록이 잠겼습니다.</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  모든 기록은 읽기 전용이며, 리포트 생성만 가능합니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 🔥 대회 운영 대시보드 구조 */}
        <div className="space-y-6">
          {/* [1] 대회 상태 요약 */}
          {tournament && (
            <TournamentStatusSummary
              associationId={associationId!}
              tournament={tournament}
            />
          )}

          {/* [1.5] 참가팀 관리 (팀이 있을 때만 표시) */}
          {tournament && (
            <TournamentTeamsManagement
              associationId={associationId!}
              tournamentId={tournamentId!}
              refreshTrigger={teamsRefreshTrigger} // 🔥 새로고침 트리거 전달
            />
          )}

          {/* [2] 운영 액션 */}
          {tournament && (
            <TournamentOpsActions
              associationId={associationId!}
              tournament={tournament}
              onActionSuccess={handleActionSuccess}
              testMode={isTestMode} // 🔥 테스트 모드 전달
            />
          )}

          {/* [3] 운영 로그 */}
          <TournamentOpsLog
            associationId={associationId!}
            tournamentId={tournamentId!}
          />

          {/* 🔥 [4] 보고/제출 (구청 제출용 PDF) */}
          {tournament && isUserAdmin && (
            <div className="mt-8">
              <GovernmentPDFGenerator
                associationId={associationId!}
                tournament={tournament}
                associationName="노원구 축구협회" // TODO: 실제 협회명 가져오기
              />
            </div>
          )}

          {/* [5] 경기장별 일정표 (하위 섹션) */}
          <div id="schedule-section" className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">경기장별 일정표</h2>
              <p className="text-sm text-gray-600 mt-1">
                경기장별로 경기 일정을 확인하고 관리합니다.
              </p>
            </div>

            {/* 날짜 선택 */}
            <div className="mb-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* 경기장 탭 */}
            {venues.length > 0 && (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {venues.map((venue) => (
                  <button
                    key={venue.id}
                    onClick={() => setSelectedVenueId(venue.id)}
                    className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedVenueId === venue.id
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {venue.name}
                  </button>
                ))}
              </div>
            )}

            {/* 경기 목록 */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : matches.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500 text-lg font-medium mb-2">등록된 경기가 없습니다.</p>
                  {!tournament?.drawExecuted ? (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-600 font-medium">
                        ※ 조 추첨 및 경기 생성 후 일정이 자동 생성됩니다.
                      </p>
                      <p className="text-sm text-gray-400">
                        먼저 위의 "1️⃣ 조 추첨 실행" 버튼을 눌러 조 추첨을 진행하세요.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-600 font-medium">
                        ※ 경기 자동 생성 버튼을 눌러 경기를 생성하세요.
                      </p>
                      <p className="text-sm text-gray-400">
                        조 추첨이 완료되었습니다. 위의 "2️⃣ 경기 자동 생성" 버튼을 눌러 진행하세요.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <Card
                    key={match.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleMatchClick(match.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-gray-600">
                              {match.startTime} - {match.endTime}
                            </span>
                            <span className="text-xs text-gray-500">
                              {match.courtNo}코트
                            </span>
                            {getStatusBadge(match.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span>{match.homeTeam}</span>
                            <span className="text-gray-400">vs</span>
                            <span>{match.awayTeam}</span>
                          </div>
                          {!match.referees.main && (
                            <div className="flex items-center gap-1 text-amber-600 text-xs mt-2">
                              <AlertCircle className="w-3 h-3" />
                              <span>심판 미배정</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMatchClick(match.id);
                          }}
                        >
                          상세
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🔥 참가팀 보기 모달 (읽기 전용 스냅샷, 운영자/관중 공용) */}
        <TeamsSnapshotModal
          open={showTeamsView}
          onClose={() => setShowTeamsView(false)}
          teams={teamsSnapshot}
          loading={teamsSnapshotLoading}
        />
      </div>
    </div>
  );
}

