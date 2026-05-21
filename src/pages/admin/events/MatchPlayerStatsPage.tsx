/**
 * 🔥 Match Player Stats 입력 페이지
 * 
 * 경로: /admin/organizations/:orgId/events/:eventId/matches/:matchId/stats
 * 
 * 역할:
 * - 경기별 선수 기록 입력
 * - 홈/원정팀 선수 기록 입력
 * - player_games 저장
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getEventMatch } from "@/services/eventMatchService";
import { getEvent } from "@/services/eventService";
import { getTeamMembers } from "@/services/teamPlayerService";
import { PlayerStatsInput } from "@/components/events/PlayerStatsInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { EventMatch } from "@/types/event";
import type { Event } from "@/types/event";
import { toast } from "sonner";

export default function MatchPlayerStatsPage() {
  const navigate = useNavigate();
  const { orgId, eventId, matchId } = useParams<{
    orgId?: string;
    eventId: string;
    matchId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<EventMatch | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [homePlayers, setHomePlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [awayPlayers, setAwayPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    if (eventId && matchId) {
      loadData();
    }
  }, [eventId, matchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingPlayers(true);

      // 경기 정보 조회
      const [matchData, eventData] = await Promise.all([
        getEventMatch(matchId),
        getEvent(eventId!),
      ]);

      if (!matchData) {
        toast.error("경기를 찾을 수 없습니다.");
        navigate(-1);
        return;
      }

      if (!eventData) {
        toast.error("행사를 찾을 수 없습니다.");
        navigate(-1);
        return;
      }

      setMatch(matchData);
      setEvent(eventData);

      // 팀 선수 목록 조회
      const [homePlayersData, awayPlayersData] = await Promise.all([
        getTeamMembers(matchData.homeTeamId).catch(() => []),
        getTeamMembers(matchData.awayTeamId).catch(() => []),
      ]);

      setHomePlayers(
        homePlayersData.map((p) => ({
          id: p.id,
          name: p.name,
        }))
      );
      setAwayPlayers(
        awayPlayersData.map((p) => ({
          id: p.id,
          name: p.name,
        }))
      );
    } catch (error: any) {
      console.error("데이터 로드 실패:", error);
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
      setLoadingPlayers(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!match || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">경기 정보를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate(-1)}>돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() =>
              navigate(
                orgId
                  ? `/admin/organizations/${orgId}/events/${eventId}`
                  : `/admin/events/${eventId}`
              )
            }
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            행사 상세로 돌아가기
          </Button>

          {/* Match Header */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">
                {match.homeTeamName || match.homeTeamId} vs {match.awayTeamName || match.awayTeamId}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">라운드:</span>{" "}
                  <span className="font-medium">{match.roundCode || "-"}</span>
                  {match.roundName && (
                    <span className="text-gray-500 ml-2">({match.roundName})</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">일정:</span>{" "}
                  <span className="font-medium">{formatDate(match.scheduledAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">점수:</span>{" "}
                  <span className="font-medium">
                    {match.status === "completed" && match.homeScore !== null && match.awayScore !== null
                      ? `${match.homeScore} - ${match.awayScore}`
                      : "-"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Stats Input */}
        {match.status !== "completed" ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">
                경기 결과를 먼저 입력해주세요.
              </p>
              <Button
                onClick={() =>
                  navigate(
                    orgId
                      ? `/admin/organizations/${orgId}/events/${eventId}`
                      : `/admin/events/${eventId}`
                  )
                }
              >
                경기 결과 입력하러 가기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 홈팀 선수 기록 */}
            <PlayerStatsInput
              match={match}
              eventId={event.id}
              divisionId={match.divisionId}
              seasonId={event.seasonId}
              teamId={match.homeTeamId}
              teamName={match.homeTeamName || match.homeTeamId}
              players={homePlayers}
              onSaved={() => {
                toast.success("선수 기록이 저장되었습니다.");
              }}
            />

            {/* 원정팀 선수 기록 */}
            <PlayerStatsInput
              match={match}
              eventId={event.id}
              divisionId={match.divisionId}
              seasonId={event.seasonId}
              teamId={match.awayTeamId}
              teamName={match.awayTeamName || match.awayTeamId}
              players={awayPlayers}
              onSaved={() => {
                toast.success("선수 기록이 저장되었습니다.");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
