/**
 * 🔥 팀 통계 페이지
 * 
 * 경로: /teams/:teamId/stats
 * 
 * 역할:
 * - 팀 통계 대시보드
 * - 승률, 득실점 차트
 * - 최근 성적 그래프
 * - 연속 기록 표시
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getTeamGames } from '@/services/teamGameService';
import type { TeamGame } from '@/types/teamGame';
import type { TeamStats } from '@/types/teamGame';

export default function TeamStatsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [recentGames, setRecentGames] = useState<TeamGame[]>([]);

  useEffect(() => {
    if (!teamId) {
      navigate('/me');
      return;
    }

    // 팀 정보 및 통계 실시간 구독
    const teamRef = doc(db, 'teams', teamId);
    const unsubscribe = onSnapshot(
      teamRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setTeam(data);
          setStats(data.stats || null);
        } else {
          navigate('/me');
        }
        setLoading(false);
      },
      (error) => {
        console.error('팀 정보 조회 실패:', error);
        setLoading(false);
      }
    );

    // 최근 경기 조회
    const loadRecentGames = async () => {
      try {
        const games = await getTeamGames(teamId, {
          status: 'completed',
          limit: 5,
        });
        setRecentGames(games);
      } catch (error) {
        console.error('최근 경기 조회 실패:', error);
      }
    };

    loadRecentGames();

    return () => unsubscribe();
  }, [teamId, navigate]);

  const getStreakIcon = () => {
    if (!stats) return null;
    
    if (stats.streakType === 'win') {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    } else if (stats.streakType === 'loss') {
      return <TrendingDown className="w-5 h-5 text-red-600" />;
    } else if (stats.streakType === 'draw') {
      return <Minus className="w-5 h-5 text-gray-600" />;
    }
    return null;
  };

  const getStreakLabel = () => {
    if (!stats) return '';
    
    if (stats.streakType === 'win') {
      return `연승 ${stats.streakCount}경기`;
    } else if (stats.streakType === 'loss') {
      return `연패 ${stats.streakCount}경기`;
    } else if (stats.streakType === 'draw') {
      return `연무 ${stats.streakCount}경기`;
    }
    return '';
  };

  const getResultColor = (result: 'win' | 'draw' | 'loss' | null) => {
    if (result === 'win') return 'text-green-600';
    if (result === 'draw') return 'text-gray-600';
    if (result === 'loss') return 'text-red-600';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!stats || !team) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-none md:mx-auto md:max-w-5xl py-6 md:p-6">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">통계 데이터가 없습니다.</p>
            <Button
              onClick={() => navigate(`/teams/${teamId}/games`)}
              variant="outline"
            >
              경기 기록 보기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const winRatePercent = (stats.winRate * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-5xl py-6 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${teamId}/manage`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            팀 관리로 돌아가기
          </button>
          <h1 className="text-2xl font-bold">{team.name} 통계</h1>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* 경기 수 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">총 경기</div>
            <div className="text-3xl font-bold">{stats.games}</div>
            <div className="text-sm text-gray-500 mt-2">
              승 {stats.wins} / 무 {stats.draws} / 패 {stats.losses}
            </div>
          </div>

          {/* 승률 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">승률</div>
            <div className="text-3xl font-bold">{winRatePercent}%</div>
            <div className="text-sm text-gray-500 mt-2">
              {stats.wins}승 {stats.draws}무 {stats.losses}패
            </div>
          </div>

          {/* 득실점 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">득실차</div>
            <div className={`text-3xl font-bold ${stats.goalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.goalDiff >= 0 ? '+' : ''}{stats.goalDiff}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              득점 {stats.goalsFor} / 실점 {stats.goalsAgainst}
            </div>
          </div>
        </div>

        {/* 연속 기록 */}
        {stats.streakType !== 'none' && stats.streakCount > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3">
              {getStreakIcon()}
              <div>
                <div className="text-sm text-gray-600">현재 연속 기록</div>
                <div className="text-xl font-bold">{getStreakLabel()}</div>
              </div>
            </div>
          </div>
        )}

        {/* 최근 경기 */}
        {recentGames.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">최근 경기</h2>
            <div className="space-y-3">
              {recentGames.map((game) => {
                const isHome = game.homeTeamId === teamId;
                const opponentName = isHome ? game.awayTeamName : game.homeTeamName;
                const myScore = isHome ? game.homeScore : game.awayScore;
                const opponentScore = isHome ? game.awayScore : game.homeScore;
                
                let result: 'win' | 'draw' | 'loss' | null = null;
                if (typeof myScore === 'number' && typeof opponentScore === 'number') {
                  if (myScore > opponentScore) {
                    result = 'win';
                  } else if (myScore < opponentScore) {
                    result = 'loss';
                  } else {
                    result = 'draw';
                  }
                }

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-lg font-bold ${getResultColor(result)}`}>
                        {result === 'win' ? '승' : result === 'draw' ? '무' : result === 'loss' ? '패' : '-'}
                      </div>
                      <div>
                        <div className="font-medium">vs {opponentName}</div>
                        {typeof myScore === 'number' && typeof opponentScore === 'number' && (
                          <div className="text-sm text-gray-600">
                            {myScore} : {opponentScore}
                          </div>
                        )}
                      </div>
                    </div>
                    {game.playedAt && (
                      <div className="text-sm text-gray-500">
                        {game.playedAt.toDate().toLocaleDateString('ko-KR')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="mt-6 flex gap-4">
          <Button
            onClick={() => navigate(`/teams/${teamId}/games`)}
            variant="outline"
            className="flex-1"
          >
            경기 기록 보기
          </Button>
          <Button
            onClick={() => navigate(`/teams/${teamId}/games/create`)}
            className="flex-1"
          >
            경기 등록
          </Button>
        </div>
      </div>
    </div>
  );
}
