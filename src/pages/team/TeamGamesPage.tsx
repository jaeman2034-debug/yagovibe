/**
 * 🔥 팀 경기 목록 페이지
 * 
 * 경로: /teams/:teamId/games
 * 
 * 역할:
 * - 팀의 모든 경기 목록 표시
 * - 경기 상태별 필터링 (예정/완료/전체)
 * - 경기 유형별 필터링 (친선/리그/토너먼트)
 * - 경기 결과 입력 (팀장/관리자만)
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { getTeamGames } from '@/services/teamGameService';
import type { TeamGame } from '@/types/teamGame';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Trophy, Plus, Edit, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { markTeamPlayEntryFromAppNav, teamPlayEntryPath } from '@/lib/team/teamPlayRoutes';

export default function TeamGamesPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<TeamGame[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<'all' | 'friendly' | 'league' | 'tournament' | 'scrimmage'>('all');

  useEffect(() => {
    if (!teamId) {
      navigate('/me');
      return;
    }

    const loadGames = async () => {
      try {
        setLoading(true);
        const teamGames = await getTeamGames(teamId, {
          status: statusFilter === 'all' ? undefined : statusFilter,
          gameType: gameTypeFilter === 'all' ? undefined : gameTypeFilter,
        });
        setGames(teamGames);
      } catch (error) {
        console.error('경기 목록 조회 실패:', error);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, [teamId, statusFilter, gameTypeFilter, navigate]);

  const getGameTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      friendly: '친선전',
      league: '리그전',
      tournament: '토너먼트',
      scrimmage: '연습경기',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: '예정',
      in_progress: '진행중',
      completed: '완료',
      cancelled: '취소',
      postponed: '연기',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      postponed: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-5xl py-6 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${teamId}/manage`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            ← 팀 관리로 돌아가기
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">경기 기록</h1>
            <Button
              onClick={() => navigate(`/teams/${teamId}/games/create`)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              경기 등록
            </Button>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">상태</label>
              <div className="flex gap-2">
                {(['all', 'scheduled', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      statusFilter === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? '전체' : status === 'scheduled' ? '예정' : '완료'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">유형</label>
              <div className="flex gap-2">
                {(['all', 'friendly', 'league', 'tournament', 'scrimmage'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setGameTypeFilter(type)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      gameTypeFilter === type
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? '전체' : getGameTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 경기 목록 */}
        {games.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">등록된 경기가 없습니다.</p>
            <Button
              onClick={() => navigate(`/teams/${teamId}/games/create`)}
              variant="outline"
            >
              첫 경기 등록하기
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map((game) => {
              const isHome = game.homeTeamId === teamId;
              const opponentName = isHome ? game.awayTeamName : game.homeTeamName;
              const myScore = isHome ? game.homeScore : game.awayScore;
              const opponentScore = isHome ? game.awayScore : game.homeScore;
              const hasResult = game.status === 'completed' && typeof myScore === 'number' && typeof opponentScore === 'number';
              const isWin = hasResult && myScore! > opponentScore!;
              const isDraw = hasResult && myScore! === opponentScore!;
              const isLoss = hasResult && myScore! < opponentScore!;

              return (
                <div
                  key={game.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 경기 정보 */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(game.status)}`}>
                          {getStatusLabel(game.status)}
                        </span>
                        <span className="text-sm text-gray-600">{getGameTypeLabel(game.gameType)}</span>
                      </div>

                      {/* 상대팀 */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-lg font-semibold">
                          {isHome ? '홈' : '원정'} vs {opponentName}
                        </div>
                      </div>

                      {/* 결과 */}
                      {hasResult && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-2xl font-bold ${isWin ? 'text-blue-600' : isDraw ? 'text-gray-600' : 'text-red-600'}`}>
                            {myScore}
                          </span>
                          <span className="text-gray-400">:</span>
                          <span className="text-2xl font-bold">{opponentScore}</span>
                          {isWin && <Trophy className="w-5 h-5 text-yellow-500" />}
                        </div>
                      )}

                      {/* 일정 정보 */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {game.scheduledAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(game.scheduledAt.toDate(), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                            </span>
                          </div>
                        )}
                        {game.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{game.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    {user && (
                      <div className="flex gap-2">
                        {game.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/teams/${teamId}/games/${game.id}/players`)}
                              className="flex items-center gap-1"
                            >
                              선수 기록
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                markTeamPlayEntryFromAppNav();
                                navigate(teamPlayEntryPath(teamId, { matchId: game.id }));
                              }}
                              className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
                            >
                              <Sparkles className="w-4 h-4" />
                              플레이 피드백
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/teams/${teamId}/games/${encodeURIComponent(game.id)}/participation`
                                )
                              }
                              className="flex items-center gap-1 border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                            >
                              출전 입력
                            </Button>
                          </>
                        )}
                        {game.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/teams/${teamId}/games/${game.id}/edit`)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            결과 입력
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
