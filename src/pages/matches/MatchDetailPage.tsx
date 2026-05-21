/**
 * 🔥 Match Detail Page (Public)
 * 
 * 경로: /matches/:matchId 또는 /events/:eventId/matches/:matchId
 * 
 * 역할:
 * - 경기 상세 정보
 * - 경기 결과
 * - 선수 기록
 * - 미디어 갤러리
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getEventMatch } from "@/services/eventMatchService";
import { getPlayerGamesByMatch } from "@/services/playerGameService";
import { MediaGallery } from "@/components/media/MediaGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Target, Image, Trophy } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { EventMatch } from "@/types/event";
import type { PlayerGame } from "@/types/playerGame";

type TabType = "overview" | "stats" | "lineup" | "media";

export default function MatchDetailPage() {
  const navigate = useNavigate();
  const { matchId, eventId } = useParams<{ matchId: string; eventId?: string }>();

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<EventMatch | null>(null);
  const [playerGames, setPlayerGames] = useState<PlayerGame[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    if (matchId) {
      loadData();
    }
  }, [matchId, eventId]);

  const loadData = async () => {
    if (!matchId) return;

    try {
      setLoading(true);

      // Match 정보 조회
      const matchData = await getEventMatch(matchId);
      setMatch(matchData);

      // Player Games 조회
      if (matchData) {
        const games = await getPlayerGamesByMatch(matchId);
        setPlayerGames(games);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("ko-KR", {
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

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">경기를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate(-1)}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const homePlayerGames = playerGames.filter((g) => g.teamId === match.homeTeamId);
  const awayPlayerGames = playerGames.filter((g) => g.teamId === match.awayTeamId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {match.homeTeamName || match.homeTeamId} vs {match.awayTeamName || match.awayTeamId}
              </h1>
              {match.status === "completed" && match.homeScore !== null && match.awayScore !== null && (
                <div className="text-5xl font-bold text-gray-900 mb-4">
                  {match.homeScore} - {match.awayScore}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
                {match.roundCode && (
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    {match.roundName || match.roundCode}
                  </div>
                )}
                {match.scheduledAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(match.scheduledAt)}
                  </div>
                )}
                {match.venueName && (
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {match.venueName}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="stats">기록</TabsTrigger>
            <TabsTrigger value="lineup">출전 명단</TabsTrigger>
            <TabsTrigger value="media">미디어</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>경기 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">홈팀</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {match.homeTeamName || match.homeTeamId}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">어웨이팀</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {match.awayTeamName || match.awayTeamId}
                    </div>
                  </div>
                  {match.scheduledAt && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">일정</div>
                      <div className="text-lg text-gray-900">{formatDate(match.scheduledAt)}</div>
                    </div>
                  )}
                  {match.venueName && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">장소</div>
                      <div className="text-lg text-gray-900">{match.venueName}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>선수 기록</CardTitle>
              </CardHeader>
              <CardContent>
                {playerGames.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">기록이 없습니다.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Home Team Stats */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {match.homeTeamName || match.homeTeamId}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                선수
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                골
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                도움
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                경고
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                퇴장
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {homePlayerGames.map((game) => (
                              <tr key={game.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {game.playerName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-green-600">
                                  {game.goals > 0 ? game.goals : "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-blue-600">
                                  {game.assists > 0 ? game.assists : "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-yellow-600">
                                  {game.yellowCards > 0 ? game.yellowCards : "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-red-600">
                                  {game.redCards > 0 ? game.redCards : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Away Team Stats */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {match.awayTeamName || match.awayTeamId}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                선수
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                골
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                도움
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                경고
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                퇴장
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {awayPlayerGames.map((game) => (
                              <tr key={game.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {game.playerName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-green-600">
                                  {game.goals > 0 ? game.goals : "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-blue-600">
                                  {game.assists > 0 ? game.assists : "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-yellow-600">
                                  {game.yellowCards > 0 ? game.yellowCards : "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-red-600">
                                  {game.redCards > 0 ? game.redCards : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lineup Tab */}
          <TabsContent value="lineup">
            <Card>
              <CardHeader>
                <CardTitle>출전 명단</CardTitle>
              </CardHeader>
              <CardContent>
                {playerGames.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">출전 명단이 없습니다.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Home Team Lineup */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {match.homeTeamName || match.homeTeamId}
                      </h3>
                      <div className="space-y-2">
                        {homePlayerGames
                          .filter((g) => g.starter)
                          .map((game) => (
                            <div
                              key={game.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-800">
                                  {game.playerName.charAt(0)}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {game.playerName}
                                </span>
                              </div>
                              {game.minutesPlayed > 0 && (
                                <span className="text-xs text-gray-500">{game.minutesPlayed}분</span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Away Team Lineup */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {match.awayTeamName || match.awayTeamId}
                      </h3>
                      <div className="space-y-2">
                        {awayPlayerGames
                          .filter((g) => g.starter)
                          .map((game) => (
                            <div
                              key={game.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm font-medium text-red-800">
                                  {game.playerName.charAt(0)}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {game.playerName}
                                </span>
                              </div>
                              {game.minutesPlayed > 0 && (
                                <span className="text-xs text-gray-500">{game.minutesPlayed}분</span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  미디어 갤러리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MediaGallery entityType="match" entityId={matchId!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
