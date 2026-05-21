/**
 * 🔥 선수 랭킹 페이지
 * 
 * 경로: /sports/:sportType/player-ranking
 * 
 * 역할:
 * - 선수 랭킹 표시
 * - 득점/어시스트 기준 정렬
 * - 선수 통계 요약
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  getPlayerRankingByGoals,
  getPlayerRankingByAssists,
  getPlayerRankingByGoalsPerGame,
} from '@/services/playerStatsService';
import type { PlayerStats } from '@/types/playerStats';
import { Trophy, Target, Zap } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type RankingType = 'goals' | 'assists' | 'goalsPerGame';

export default function PlayerRankingPage() {
  const { sportType } = useParams<{ sportType: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<(PlayerStats & { playerName: string })[]>([]);
  const [rankingType, setRankingType] = useState<RankingType>('goals');
  const [minGames, setMinGames] = useState(3);

  useEffect(() => {
    if (!sportType) {
      navigate('/');
      return;
    }

    const loadRanking = async () => {
      try {
        setLoading(true);

        let ranking: PlayerStats[] = [];

        if (rankingType === 'goals') {
          ranking = await getPlayerRankingByGoals(sportType, 100);
        } else if (rankingType === 'assists') {
          ranking = await getPlayerRankingByAssists(sportType, 100);
        } else {
          ranking = await getPlayerRankingByGoalsPerGame(sportType, minGames, 100);
        }

        // 최소 경기 수 필터
        const filtered = ranking.filter((p) => p.games >= minGames);

        // 선수 이름 조회
        const playersWithNames = await Promise.all(
          filtered.map(async (player) => {
            const userRef = doc(db, 'users', player.playerId);
            const userSnap = await getDoc(userRef);
            let playerName = player.playerId;

            if (userSnap.exists()) {
              const userData = userSnap.data();
              playerName = userData.displayName || userData.name || player.playerId;
            }

            return {
              ...player,
              playerName,
            };
          })
        );

        setPlayers(playersWithNames);
      } catch (error) {
        console.error('선수 랭킹 조회 실패:', error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [sportType, rankingType, minGames, navigate]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    } else if (rank === 2) {
      return <Trophy className="w-6 h-6 text-gray-400" />;
    } else if (rank === 3) {
      return <Trophy className="w-6 h-6 text-orange-400" />;
    }
    return <span className="text-gray-600 font-semibold">{rank}</span>;
  };

  const getSportLabel = (sport: string) => {
    const labels: Record<string, string> = {
      football: '축구',
      basketball: '농구',
      baseball: '야구',
    };
    return labels[sport] || sport;
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
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">
              {getSportLabel(sportType || '')} 선수 랭킹
            </h1>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* 정렬 기준 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">정렬 기준</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRankingType('goals')}
                  className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                    rankingType === 'goals'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  득점
                </button>
                <button
                  onClick={() => setRankingType('assists')}
                  className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                    rankingType === 'assists'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  어시스트
                </button>
                <button
                  onClick={() => setRankingType('goalsPerGame')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    rankingType === 'goalsPerGame'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  득점/경기
                </button>
              </div>
            </div>

            {/* 최소 경기 수 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">최소 경기 수</label>
              <select
                value={minGames}
                onChange={(e) => setMinGames(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={1}>1경기 이상</option>
                <option value={3}>3경기 이상</option>
                <option value={5}>5경기 이상</option>
                <option value={10}>10경기 이상</option>
              </select>
            </div>
          </div>
        </div>

        {/* 랭킹 테이블 */}
        {players.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">랭킹 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    선수
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    경기
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    득점
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    어시스트
                  </th>
                  {rankingType === 'goalsPerGame' && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      득점/경기
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player, index) => {
                  const rank = index + 1;

                  return (
                    <tr
                      key={player.playerId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/players/${player.playerId}/stats`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {getRankIcon(rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {player.playerName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {player.games}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-blue-600">
                          {player.goals}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-green-600">
                          {player.assists}
                        </span>
                      </td>
                      {rankingType === 'goalsPerGame' && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {player.goalsPerGame.toFixed(2)}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
