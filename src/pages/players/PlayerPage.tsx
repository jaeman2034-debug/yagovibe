/**
 * 🔥 Player Public Page
 * 
 * 경로: /players/:playerId
 * 
 * 역할:
 * - 선수 공개 프로필
 * - 선수 기록 조회
 * - 선수 경기 이력
 * - 선수 수상 이력
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPlayerSummary, getPlayerMatchHistory, getPlayerAwards, getPlayerEventSummaries } from "@/services/playerSummaryService";
import { fetchTeam } from "@/services/teamService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Calendar, Award, Target, Image } from "lucide-react";
import { Loader2 } from "lucide-react";
import { MediaGallery } from "@/components/media/MediaGallery";
import type { PlayerSummary, PlayerMatchHistory, PlayerAward } from "@/types/playerSummary";
import type { PlayerEventSummary } from "@/types/playerStats";

type TabType = "overview" | "matches" | "events" | "awards" | "media";

export default function PlayerPage() {
  const navigate = useNavigate();
  const { playerId } = useParams<{ playerId: string }>();

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [matchHistory, setMatchHistory] = useState<PlayerMatchHistory[]>([]);
  const [awards, setAwards] = useState<PlayerAward[]>([]);
  const [eventSummaries, setEventSummaries] = useState<PlayerEventSummary[]>([]);
  const [currentTeam, setCurrentTeam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    if (playerId) {
      loadData();
    }
  }, [playerId]);

  const loadData = async () => {
    if (!playerId) return;

    try {
      setLoading(true);

      // 선수 정보 조회 (users 컬렉션)
      const userDoc = await getDoc(doc(db, "users", playerId));
      if (userDoc.exists()) {
        setPlayer({ id: userDoc.id, ...userDoc.data() });
      }

      const [summaryData, matchHistoryData, awardsData, eventSummariesData] = await Promise.all([
        getPlayerSummary(playerId),
        getPlayerMatchHistory(playerId, { limit: 10 }),
        getPlayerAwards(playerId),
        getPlayerEventSummaries(playerId),
      ]);

      setSummary(summaryData);
      setMatchHistory(matchHistoryData);
      setAwards(awardsData);
      setEventSummaries(eventSummariesData);

      // 현재 팀 정보 조회
      if (summaryData?.currentTeamId) {
        const teamData = await fetchTeam(summaryData.currentTeamId);
        setCurrentTeam(teamData);
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
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">선수를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate(-1)}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const playerName = player.displayName || player.name || player.nickname || player.email?.split("@")[0] || playerId;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Player Hero */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {player.photoURL && (
                <img
                  src={player.photoURL}
                  alt={playerName}
                  className="w-24 h-24 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{playerName}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {player.position && (
                    <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {player.position}
                    </div>
                  )}
                  {currentTeam && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {currentTeam.name}
                    </div>
                  )}
                  {player.jerseyNumber && (
                    <div>등번호 {player.jerseyNumber}</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500 mb-1">출전</div>
                <div className="text-2xl font-bold text-gray-900">{summary.appearances}</div>
                <div className="text-xs text-gray-500 mt-1">선발 {summary.starts}경기</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500 mb-1">득점</div>
                <div className="text-2xl font-bold text-green-600">{summary.goals}</div>
                <div className="text-xs text-gray-500 mt-1">
                  경기당 {summary.appearances > 0 ? (summary.goals / summary.appearances).toFixed(2) : "0"}골
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500 mb-1">도움</div>
                <div className="text-2xl font-bold text-blue-600">{summary.assists}</div>
                <div className="text-xs text-gray-500 mt-1">경기당 {summary.appearances > 0 ? (summary.assists / summary.appearances).toFixed(2) : "0"}도움</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-500 mb-1">수상</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.mvpAwards + summary.topScorerAwards + summary.best11Awards}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  MVP {summary.mvpAwards} · 득점왕 {summary.topScorerAwards}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="matches">경기 기록</TabsTrigger>
            <TabsTrigger value="events">대회별 기록</TabsTrigger>
            <TabsTrigger value="awards">수상</TabsTrigger>
            <TabsTrigger value="media">미디어</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>최근 경기</CardTitle>
              </CardHeader>
              <CardContent>
                {matchHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">경기 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {matchHistory.slice(0, 5).map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {match.teamName || match.teamId} vs {match.opponentTeamName || match.opponentTeamId}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(match.matchDate)} · {match.stageLabel || "-"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {match.goals > 0 && <span className="text-green-600">{match.goals}골</span>}
                            {match.assists > 0 && (
                              <span className="ml-2 text-blue-600">{match.assists}도움</span>
                            )}
                            {match.goals === 0 && match.assists === 0 && (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>경기 기록</CardTitle>
              </CardHeader>
              <CardContent>
                {matchHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">경기 기록이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            날짜
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            경기
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            골
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            도움
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            경고
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            퇴장
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matchHistory.map((match) => (
                          <tr key={match.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(match.matchDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {match.teamName || match.teamId} vs {match.opponentTeamName || match.opponentTeamId}
                              {match.stageLabel && (
                                <span className="ml-2 text-xs text-gray-500">· {match.stageLabel}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600">
                              {match.goals > 0 ? match.goals : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">
                              {match.assists > 0 ? match.assists : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-yellow-600">
                              {match.yellowCards > 0 ? match.yellowCards : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600">
                              {match.redCards > 0 ? match.redCards : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>대회별 기록</CardTitle>
              </CardHeader>
              <CardContent>
                {eventSummaries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">대회 기록이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            대회
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            팀
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            출전
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            골
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            도움
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {eventSummaries.map((summary) => (
                          <tr key={summary.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {summary.eventId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {summary.teamName || summary.teamId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {summary.appearances}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600">
                              {summary.goals}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600">
                              {summary.assists}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Awards Tab */}
          <TabsContent value="awards">
            <Card>
              <CardHeader>
                <CardTitle>수상 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {awards.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">수상 이력이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {awards.map((award) => (
                      <div
                        key={award.id}
                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200"
                      >
                        <Award className="w-8 h-8 text-yellow-600" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{award.title}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(award.awardedAt)}
                          </div>
                        </div>
                      </div>
                    ))}
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
                <MediaGallery entityType="player" entityId={playerId!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
