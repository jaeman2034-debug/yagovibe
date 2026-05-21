/**
 * 🔥 대회용 팀 상세 페이지 (팀 대표 전용, 천재 모드)
 * 
 * 경로: /association/:associationId/tournaments/:tournamentId/teams/:teamId
 * 
 * 역할:
 * - 팀 정보 조회
 * - 팀원 등록/삭제 (ROSTER_OPEN일 때만)
 * - 팀 대표만 접근 가능
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { RosterManagement } from "@/components/tournament/RosterManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import type { Tournament, TournamentTeam } from "@/types/tournament";

export default function TournamentTeamDetailPage() {
  const { associationId, tournamentId, teamId } = useParams<{
    associationId: string;
    tournamentId: string;
    teamId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [team, setTeam] = useState<TournamentTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinStatus, setCheckinStatus] = useState<{
    status: "NOT_CHECKED_IN" | "CHECKED_IN" | "LATE" | "NO_SHOW" | "DISQUALIFIED";
    checkedInAt?: any;
  } | null>(null);

  // 🔥 팀 정보 실시간 구독
  useEffect(() => {
    if (!associationId || !tournamentId || !teamId) {
      setLoading(false);
      return;
    }

    const teamRef = doc(
      db,
      "associations",
      associationId,
      "tournaments",
      tournamentId,
      "teams",
      teamId
    );

    const unsub = onSnapshot(
      teamRef,
      (snap) => {
        if (!snap.exists()) {
          setTeam(null);
          setLoading(false);
          return;
        }
        setTeam({
          id: snap.id,
          ...snap.data(),
        } as TournamentTeam);
        setLoading(false);
      },
      (error) => {
        console.error("[팀 상세 조회 오류]", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [associationId, tournamentId, teamId]);

  // 🔥 대회 정보 조회
  useEffect(() => {
    if (!associationId || !tournamentId) return;

    const tournamentRef = doc(
      db,
      "associations",
      associationId,
      "tournaments",
      tournamentId
    );

    getDoc(tournamentRef).then((snap) => {
      if (snap.exists()) {
        setTournament({
          id: snap.id,
          ...snap.data(),
        } as Tournament);
      }
    });
  }, [associationId, tournamentId]);

  // 🔥 STEP 6: 체크인 상태 조회 (참가자용)
  useEffect(() => {
    if (!associationId || !tournamentId || !teamId) return;
    if (!tournament || (tournament.tournamentPhase !== "DRAW_DONE" && tournament.tournamentPhase !== "CHECKIN_OPEN" && tournament.tournamentPhase !== "MATCHES_RUNNING")) {
      setCheckinStatus(null);
      return;
    }

    const checkinRef = doc(
      db,
      "associations",
      associationId,
      "tournaments",
      tournamentId,
      "checkins",
      "teams",
      teamId
    );

    const unsub = onSnapshot(
      checkinRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCheckinStatus({
            status: data.status || "NOT_CHECKED_IN",
            checkedInAt: data.checkedInAt,
          });
        } else {
          setCheckinStatus({
            status: "NOT_CHECKED_IN",
          });
        }
      },
      (error) => {
        console.error("[체크인 상태 조회 오류]", error);
        setCheckinStatus(null);
      }
    );

    return () => unsub();
  }, [associationId, tournamentId, teamId, tournament?.tournamentPhase]);

  // 🔥 권한 체크: 팀 대표만 접근 가능
  useEffect(() => {
    if (!team || !user) return;

    if (team.captainUid !== user.uid) {
      navigate(`/association/${associationId}/tournaments/${tournamentId}`);
    }
  }, [team, user, navigate, associationId, tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!team || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600">팀 정보를 찾을 수 없습니다.</p>
          <Button
            onClick={() => navigate(`/association/${associationId}/tournaments/${tournamentId}`)}
            className="mt-4"
          >
            대회 페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 🔥 권한 체크: 팀 대표가 아니면 접근 불가
  if (team.captainUid !== user?.uid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600">팀 대표만 접근할 수 있습니다.</p>
          <Button
            onClick={() => navigate(`/association/${associationId}/tournaments/${tournamentId}`)}
            className="mt-4"
          >
            대회 페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate(`/association/${associationId}/tournaments/${tournamentId}`)}
                className="mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                대회 페이지로 돌아가기
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{team.teamName}</h1>
              <p className="text-sm text-gray-600 mt-1">{tournament.name}</p>
            </div>
          </div>

          {/* 🔥 STEP 3-1 + STEP 4: Phase 상태 배너 (페이지 최상단) */}
          {tournament.tournamentPhase && (
            <Alert
              className={
                tournament.tournamentPhase === "ROSTER_OPEN"
                  ? "bg-green-50 border-green-200"
                  : tournament.tournamentPhase === "ROSTER_LOCKED"
                  ? "bg-yellow-50 border-yellow-200"
                  : tournament.tournamentPhase === "DRAW_DONE"
                  ? "bg-purple-50 border-purple-200"
                  : "bg-blue-50 border-blue-200"
              }
            >
              <AlertDescription
                className={
                  tournament.tournamentPhase === "ROSTER_OPEN"
                    ? "text-green-800"
                    : tournament.tournamentPhase === "ROSTER_LOCKED"
                    ? "text-yellow-800"
                    : tournament.tournamentPhase === "DRAW_DONE"
                    ? "text-purple-800"
                    : "text-blue-800"
                }
              >
                {tournament.tournamentPhase === "ROSTER_OPEN"
                  ? "🟢 현재 팀원 등록 기간입니다. 팀원을 추가해주세요."
                  : tournament.tournamentPhase === "ROSTER_LOCKED"
                  ? "🔒 팀원 명단이 확정되었습니다. 더 이상 수정할 수 없습니다."
                  : tournament.tournamentPhase === "DRAW_DONE"
                  ? "🎲 조 추첨이 완료되었습니다. 아래에서 조 편성을 확인하세요."
                  : tournament.tournamentPhase === "CHECKIN_OPEN"
                  ? "📋 체크인 기간입니다. 대회 당일 체크인을 완료해주세요."
                  : tournament.tournamentPhase === "MATCHES_RUNNING"
                  ? "⚽ 경기가 진행 중입니다."
                  : "⏳ 팀원 등록 기간이 아닙니다. 관리자 오픈을 기다려주세요."}
              </AlertDescription>
            </Alert>
          )}

          {/* 🔥 STEP 6: 체크인 상태 배너 (참가자용) */}
          {checkinStatus && (tournament.tournamentPhase === "CHECKIN_OPEN" || tournament.tournamentPhase === "MATCHES_RUNNING") && (
            <Alert
              className={
                checkinStatus.status === "CHECKED_IN"
                  ? "bg-green-50 border-green-200"
                  : checkinStatus.status === "LATE"
                  ? "bg-yellow-50 border-yellow-200"
                  : checkinStatus.status === "NO_SHOW" || checkinStatus.status === "DISQUALIFIED"
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
              }
            >
              <AlertDescription
                className={
                  checkinStatus.status === "CHECKED_IN"
                    ? "text-green-800"
                    : checkinStatus.status === "LATE"
                    ? "text-yellow-800"
                    : checkinStatus.status === "NO_SHOW" || checkinStatus.status === "DISQUALIFIED"
                    ? "text-red-800"
                    : "text-gray-800"
                }
              >
                {checkinStatus.status === "CHECKED_IN" && checkinStatus.checkedInAt && (
                  <>
                    ✅ 체크인 완료: {new Date(checkinStatus.checkedInAt.toDate()).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}
                {checkinStatus.status === "LATE" && (
                  <>⏰ 지각 처리되었습니다.</>
                )}
                {checkinStatus.status === "NO_SHOW" && (
                  <>❌ 노쇼 처리되었습니다.</>
                )}
                {checkinStatus.status === "DISQUALIFIED" && (
                  <>🚫 실격 처리되었습니다.</>
                )}
                {checkinStatus.status === "NOT_CHECKED_IN" && (
                  <>⏳ 체크인 필요: 대회 당일 체크인 장소에서 체크인을 완료해주세요.</>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 팀 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>팀 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">팀명:</span> {team.teamName}
              </div>
              {team.managerName && (
                <div className="text-sm">
                  <span className="font-medium">팀장:</span> {team.managerName}
                </div>
              )}
              {team.phone && (
                <div className="text-sm">
                  <span className="font-medium">연락처:</span> {team.phone}
                </div>
              )}
              {team.status && (
                <div className="text-sm">
                  <span className="font-medium">상태:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      team.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : team.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {team.status}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 🔥 팀원 등록 관리 (핵심 기능) */}
          <RosterManagement
            associationId={associationId!}
            tournamentId={tournamentId!}
            teamId={teamId!}
            team={team}
            tournament={tournament}
          />
        </div>
      </div>
    </div>
  );
}
