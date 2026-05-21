/**
 * 🔥 리그 상세 페이지
 * 
 * 경로: /leagues/:leagueId
 * 
 * 역할:
 * - 리그 정보 표시
 * - 참가 팀 목록
 * - 순위표
 * - 경기 일정
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getLeague, getLeagueTeams, getLeagueStandings, getLeagueGames } from '@/services/leagueService';
import type { League, LeagueTeam, LeagueStanding, LeagueGame } from '@/types/league';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type TabType = 'info' | 'standings' | 'games' | 'teams';

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [games, setGames] = useState<LeagueGame[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  useEffect(() => {
    if (!leagueId) {
      navigate('/leagues');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const [leagueData, teamsData, standingsData, gamesData] = await Promise.all([
          getLeague(leagueId),
          getLeagueTeams(leagueId),
          getLeagueStandings(leagueId),
          getLeagueGames(leagueId),
        ]);

        if (!leagueData) {
          navigate('/leagues');
          return;
        }

        setLeague(leagueData);
        setTeams(teamsData);
        setStandings(standingsData);
        setGames(gamesData);
      } catch (error) {
        console.error('리그 정보 조회 실패:', error);
        navigate('/leagues');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leagueId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!league) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/leagues')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            리그 목록으로 돌아가기
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{league.name}</h1>
              <p className="text-gray-600 mt-1">
                {league.season} 시즌 · {league.region}
              </p>
            </div>
            {league.status === 'active' && (
              <Button
                onClick={() => navigate(`/leagues/${leagueId}/games/create`)}
              >
                경기 생성
              </Button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {(['info', 'standings', 'games', 'teams'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'info' ? '정보' :
                   tab === 'standings' ? '순위' :
                   tab === 'games' ? '경기' :
                   tab === 'teams' ? '참가팀' : tab}
                </button>
              ))}
            </nav>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">리그 설명</h3>
                  <p className="text-gray-900">{league.description || '설명이 없습니다.'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">기간</h3>
                  <p className="text-gray-900">
                    {format(league.startDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })} ~{' '}
                    {format(league.endDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">참가 팀 수</h3>
                  <p className="text-gray-900">{teams.length}팀</p>
                </div>
              </div>
            )}

            {activeTab === 'standings' && (
              <div>
                {standings.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">순위 데이터가 없습니다.</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">순위</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">팀</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">경기</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">승</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">무</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">패</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">득점</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">실점</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">득실차</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">승점</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {standings.map((standing, index) => (
                        <tr
                          key={standing.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/teams/${encodeURIComponent(standing.teamId)}/play`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {index < 3 ? (
                              <Trophy className={`w-5 h-5 mx-auto ${
                                index === 0 ? 'text-yellow-500' :
                                index === 1 ? 'text-gray-400' :
                                'text-orange-400'
                              }`} />
                            ) : (
                              <span className="text-gray-600 font-semibold">{index + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{standing.teamName}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">{standing.games}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">{standing.wins}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">{standing.draws}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">{standing.losses}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">{standing.goalsFor}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">{standing.goalsAgainst}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`text-sm font-semibold ${
                              standing.goalDiff >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {standing.goalDiff >= 0 ? '+' : ''}{standing.goalDiff}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="text-sm font-bold text-blue-600">{standing.points}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'games' && (
              <div>
                {games.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">경기 일정이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {games.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="text-lg font-semibold">
                            {game.homeTeamName} vs {game.awayTeamName}
                          </div>
                          {game.scheduledAt && (
                            <div className="text-sm text-gray-600 mt-1">
                              {format(game.scheduledAt.toDate(), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {game.status === 'completed' && typeof game.homeScore === 'number' && typeof game.awayScore === 'number' ? (
                            <div className="text-xl font-bold">
                              {game.homeScore} : {game.awayScore}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">예정</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teams' && (
              <div>
                {teams.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">참가 팀이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/teams/${encodeURIComponent(team.teamId)}/play`)}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">{team.teamName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
