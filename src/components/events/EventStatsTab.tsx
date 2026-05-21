/**
 * 🔥 Event Stats Tab 컴포넌트
 * 
 * 역할:
 * - Event별 통계 및 리더보드 표시
 * - Top Scorers, Top Assists, Appearances, Teams 등
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllEventLeaderboards, getEventLeaderboard, type LeaderboardCategory } from "@/services/leaderboardService";
import { getEventStatsSummary, getTeamEventSummaries } from "@/services/eventStatsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Users, Award, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { Leaderboard } from "@/services/leaderboardService";
import type { EventStatsSummary } from "@/services/eventStatsService";
import type { TeamEventSummary } from "@/types/teamSummary";

interface EventStatsTabProps {
  eventId: string;
  divisionId?: string | null;
}

type StatsTabType = "goals" | "assists" | "appearances" | "discipline" | "teams";

export default function EventStatsTab({ eventId, divisionId }: EventStatsTabProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EventStatsSummary | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<LeaderboardCategory, Leaderboard | null>>({
    goals: null,
    assists: null,
    appearances: null,
    yellow_cards: null,
    red_cards: null,
  });
  const [teams, setTeams] = useState<TeamEventSummary[]>([]);
  const [activeTab, setActiveTab] = useState<StatsTabType>("goals");

  useEffect(() => {
    loadData();
  }, [eventId, divisionId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [summaryData, leaderboardsData, teamsData] = await Promise.all([
        getEventStatsSummary(eventId),
        getAllEventLeaderboards(eventId, divisionId),
        getTeamEventSummaries(eventId, divisionId),
      ]);

      setSummary(summaryData);
      setLeaderboards(leaderboardsData);
      setTeams(teamsData);
    } catch (error) {
      console.error("Stats 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">총 경기</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.totalMatches}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    완료 {summary.completedMatches}경기
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">총 득점</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.totalGoals}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    경기당 {summary.avgGoalsPerMatch.toFixed(2)}골
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">등록 선수</div>
                  <div className="text-2xl font-bold text-gray-900">{summary.totalPlayers}</div>
                  <div className="text-xs text-gray-500 mt-1">명</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">평균 득점</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {summary.avgGoalsPerMatch.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">골/경기</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatsTabType)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="goals">득점</TabsTrigger>
          <TabsTrigger value="assists">도움</TabsTrigger>
          <TabsTrigger value="appearances">출전</TabsTrigger>
          <TabsTrigger value="discipline">경고</TabsTrigger>
          <TabsTrigger value="teams">팀 순위</TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <LeaderboardTable
            title="득점 순위"
            metricLabel="골"
            leaderboard={leaderboards.goals}
            emptyMessage="득점 기록이 없습니다."
          />
        </TabsContent>

        {/* Assists Tab */}
        <TabsContent value="assists">
          <LeaderboardTable
            title="도움 순위"
            metricLabel="도움"
            leaderboard={leaderboards.assists}
            emptyMessage="도움 기록이 없습니다."
          />
        </TabsContent>

        {/* Appearances Tab */}
        <TabsContent value="appearances">
          <LeaderboardTable
            title="출전 순위"
            metricLabel="출전"
            leaderboard={leaderboards.appearances}
            emptyMessage="출전 기록이 없습니다."
          />
        </TabsContent>

        {/* Discipline Tab */}
        <TabsContent value="discipline">
          <div className="space-y-6">
            <LeaderboardTable
              title="경고 순위"
              metricLabel="경고"
              leaderboard={leaderboards.yellow_cards}
              emptyMessage="경고 기록이 없습니다."
            />
            <LeaderboardTable
              title="퇴장 순위"
              metricLabel="퇴장"
              leaderboard={leaderboards.red_cards}
              emptyMessage="퇴장 기록이 없습니다."
            />
          </div>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <TeamRankingsTable teams={teams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Leaderboard Table 컴포넌트
 */
interface LeaderboardTableProps {
  title: string;
  metricLabel: string;
  leaderboard: Leaderboard | null;
  emptyMessage: string;
}

function LeaderboardTable({ title, metricLabel, leaderboard, emptyMessage }: LeaderboardTableProps) {
  if (!leaderboard || leaderboard.leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  순위
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  선수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  팀
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {metricLabel}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  출전
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboard.leaderboard.map((row) => (
                <tr key={row.playerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link
                      to={`/public/players/${row.playerId}`}
                      className="text-blue-600 hover:text-blue-900 hover:underline"
                    >
                      {row.playerName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.teamId ? (
                      <Link
                        to={`/public/teams/${row.teamId}`}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {row.teamName || row.teamId}
                      </Link>
                    ) : (
                      row.teamName || "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                    {row.value}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {row.appearances || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Team Rankings Table 컴포넌트
 */
interface TeamRankingsTableProps {
  teams: TeamEventSummary[];
}

function TeamRankingsTable({ teams }: TeamRankingsTableProps) {
  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>팀 순위</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">팀 기록이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>팀 순위</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  순위
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  팀
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  경기
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  승
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  무
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  패
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  득점
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  실점
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  차이
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teams.map((team, index) => (
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link
                      to={`/public/teams/${team.teamId}`}
                      className="text-blue-600 hover:text-blue-900 hover:underline"
                    >
                      {team.teamName || team.teamId}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.matches}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-green-600">
                    {team.wins}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.draws}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-red-600">
                    {team.losses}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                    {team.goalsFor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {team.goalsAgainst}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {team.goalDifference > 0 ? "+" : ""}
                    {team.goalDifference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
