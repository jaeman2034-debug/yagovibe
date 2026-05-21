/**
 * 🔥 경기 상세 새창 (운영 모드)
 * Phase 1-3: 현장 운영 핵심 화면
 * 
 * 경로: /association/:associationId/admin/tournaments/:tournamentId/matches/:matchId
 * 
 * MVP 구성:
 * - 출전명단(양팀)
 * - 검인 상태(아이콘)
 * - 경고/퇴장(버튼)
 * - 메모
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle, XCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { getMatchDetail, updateMatchStatus } from "@/lib/tournament/matchRepository";
import { createCheckIn } from "@/lib/tournament/checkinRepository";
import { createCard, createMemo } from "@/lib/tournament/tournamentRepository";
import type { MatchDetailOps, RosterItem } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";
import { serverTimestamp } from "firebase/firestore";
import { getMatchAuditLogs } from "@/lib/tournament/auditRepository";
import { AuditLogTimeline } from "@/components/tournament/AuditLogTimeline";
import type { AuditLog } from "@/types/auditLog";
import { isAdmin } from "@/lib/tournament/refereeRoleRepository";

export default function MatchDetailOpsPage() {
  const { associationId, tournamentId, matchId } = useParams<{
    associationId: string;
    tournamentId: string;
    matchId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [matchDetail, setMatchDetail] = useState<MatchDetailOps | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin();
      setIsUserAdmin(admin);
    };
    checkAdmin();
  }, []);

  // 경기 상세 로드 + 로그 수집 + Lock 상태 확인
  useEffect(() => {
    if (!associationId || !tournamentId || !matchId) return;
    
    const loadMatch = async () => {
      try {
        setLoading(true);
        const detail = await getMatchDetail(associationId, tournamentId, matchId);
        setMatchDetail(detail);
        
        // Lock 상태 확인
        const locked = await isTournamentLocked(associationId, tournamentId);
        setIsLocked(locked);
        
        // 관리자만 로그 수집
        const admin = await isAdmin();
        if (admin) {
          const logs = await getMatchAuditLogs(associationId, tournamentId, matchId);
          setAuditLogs(logs);
        }
      } catch (error) {
        console.error("경기 상세 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMatch();
  }, [associationId, tournamentId, matchId]);

  const handleStartMatch = async () => {
    if (!associationId || !tournamentId || !matchId || !user) return;
    try {
      await updateMatchStatus(associationId, tournamentId, matchId, "LIVE", {
        startedAt: serverTimestamp() as any,
      });
      // 재로드
      const detail = await getMatchDetail(associationId, tournamentId, matchId);
      setMatchDetail(detail);
    } catch (error) {
      console.error("경기 시작 오류:", error);
      alert("경기 시작에 실패했습니다.");
    }
  };

  const handleEndMatch = async () => {
    if (!associationId || !tournamentId || !matchId || !user) return;
    try {
      await updateMatchStatus(associationId, tournamentId, matchId, "END", {
        endedAt: serverTimestamp() as any,
      });
      // 재로드
      const detail = await getMatchDetail(associationId, tournamentId, matchId);
      setMatchDetail(detail);
    } catch (error) {
      console.error("경기 종료 오류:", error);
      alert("경기 종료에 실패했습니다.");
    }
  };

  const handleCheckIn = async (playerId: string, method: "QR" | "MANUAL") => {
    if (!associationId || !tournamentId || !matchId || !user) return;
    try {
      await createCheckIn(associationId, tournamentId, matchId, {
        playerId,
        method,
        result: "SUCCESS",
        checkedBy: user.uid,
        verified: true,
      });
      // 재로드
      const detail = await getMatchDetail(associationId, tournamentId, matchId);
      setMatchDetail(detail);
      setShowCheckInModal(false);
    } catch (error) {
      console.error("검인 오류:", error);
      alert("검인에 실패했습니다.");
    }
  };

  if (!associationId || !tournamentId || !matchId) {
    return <div>경기 정보를 찾을 수 없습니다.</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!matchDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">경기를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const homeRosters = matchDetail.rosters.filter((r) => r.teamSide === "HOME");
  const awayRosters = matchDetail.rosters.filter((r) => r.teamSide === "AWAY");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/association/${associationId}/admin/tournaments/${tournamentId}/ops`)}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm flex items-center gap-1"
          >
            ← 일정표로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {matchDetail.homeTeam} vs {matchDetail.awayTeam}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span>{matchDetail.date}</span>
            <span>{matchDetail.startTime} - {matchDetail.endTime}</span>
            <span>{matchDetail.courtNo}코트</span>
          </div>
        </div>

        {/* 🔒 대회 종료 상태 배지 */}
        {isLocked && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Lock className="w-5 h-5" />
                <span className="font-semibold">대회가 종료되어 모든 기록이 잠겼습니다.</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                검인, 경고/퇴장, 메모 등 모든 기록은 읽기 전용입니다.
              </p>
            </CardContent>
          </Card>
        )}

        {/* 경기 제어 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3 flex-wrap">
              {matchDetail.status === "WAIT" && !isLocked && (
                <Button onClick={handleStartMatch} className="flex-1" disabled={isLocked}>
                  경기 시작
                </Button>
              )}
              {matchDetail.status === "LIVE" && !isLocked && (
                <Button onClick={handleEndMatch} variant="destructive" className="flex-1" disabled={isLocked}>
                  경기 종료
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  // 모바일에서는 QR 스캔 화면으로, 데스크톱에서는 수동 검인 모달
                  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                  if (isMobile) {
                    navigate(
                      `/association/${associationId}/admin/tournaments/${tournamentId}/matches/${matchId}/checkin`
                    );
                  } else {
                    setShowCheckInModal(true);
                  }
                }}
                disabled={isLocked}
              >
                <Users className="w-4 h-4 mr-2" />
                검인
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCardModal(true)}
                disabled={isLocked}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                경고/퇴장
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowMemoModal(true)}
                disabled={isLocked}
              >
                <FileText className="w-4 h-4 mr-2" />
                메모
              </Button>
            </div>
            {isLocked && (
              <p className="text-xs text-muted-foreground mt-2">
                대회가 종료되어 기록을 수정할 수 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 출전 명단 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* 홈팀 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{matchDetail.homeTeam}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {homeRosters.length === 0 ? (
                  <p className="text-sm text-gray-500">출전 명단 없음</p>
                ) : (
                  homeRosters.map((roster) => (
                    <div
                      key={roster.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {roster.jerseyNumber}번 {roster.name}
                        </span>
                        {roster.checked ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      {!roster.checked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckIn(roster.playerId, "MANUAL")}
                        >
                          검인
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* 원정팀 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{matchDetail.awayTeam}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {awayRosters.length === 0 ? (
                  <p className="text-sm text-gray-500">출전 명단 없음</p>
                ) : (
                  awayRosters.map((roster) => (
                    <div
                      key={roster.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {roster.jerseyNumber}번 {roster.name}
                        </span>
                        {roster.checked ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      {!roster.checked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckIn(roster.playerId, "MANUAL")}
                        >
                          검인
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 경고/퇴장 기록 */}
        {matchDetail.cards.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">경고/퇴장 기록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {matchDetail.cards.map((card) => (
                  <div key={card.id} className="flex items-center gap-2 p-2 border rounded">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      card.type === "RED" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {card.type === "RED" ? "퇴장" : "경고"}
                    </span>
                    <span className="text-sm">선수 ID: {card.playerId}</span>
                    {card.minute && <span className="text-xs text-gray-500">{card.minute}분</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 심판 메모 */}
        {matchDetail.memos.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">심판 메모</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {matchDetail.memos.map((memo) => (
                  <div key={memo.id} className="p-3 border rounded bg-gray-50">
                    <p className="text-sm">{memo.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {memo.createdAt?.toDate?.()?.toLocaleString("ko-KR")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 🔥 관리자 로그 뷰 (관리자 전용) */}
        {isUserAdmin && (
          <AuditLogTimeline logs={auditLogs} title="경기 로그 타임라인 (관리자 전용)" />
        )}
      </div>
    </div>
  );
}

