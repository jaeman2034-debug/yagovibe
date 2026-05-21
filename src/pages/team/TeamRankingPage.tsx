/**
 * 🔥 팀 랭킹 페이지
 * 
 * 경로: /teams/ranking
 * 
 * 역할:
 * - teams.stats 기반 팀 랭킹 표시
 * - 정렬 기준: 승률, 득실차, 승수
 * - 종목별 필터링
 * - 지역별 필터링
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TeamStats } from '@/types/teamGame';

interface TeamWithStats {
  id: string;
  name: string;
  sportType: string;
  region: string;
  logo?: string;
  stats: TeamStats;
}

type SortBy = 'winRate' | 'goalDiff' | 'wins' | 'games';
type SportFilter = 'all' | 'football' | 'basketball' | 'baseball';

export default function TeamRankingPage() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('winRate');
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [minGames, setMinGames] = useState(3); // 최소 경기 수 필터

  useEffect(() => {
    const loadRankings = async () => {
      try {
        setLoading(true);

        // teams 컬렉션 쿼리
        let q: any = collection(db, 'teams');

        // 종목 필터
        if (sportFilter !== 'all') {
          q = query(q, where('sportType', '==', sportFilter));
        }

        // 활성 팀만
        q = query(q, where('status', '==', 'active'));

        // 정렬은 클라이언트에서 처리 (stats 필드가 복합이므로)
        const snapshot = await getDocs(q);

        const teamsData: TeamWithStats[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // stats가 있고 최소 경기 수 이상인 팀만
          if (data.stats && data.stats.games >= minGames) {
            teamsData.push({
              id: doc.id,
              name: data.name,
              sportType: data.sportType,
              region: data.region || '',
              logo: data.logo,
              stats: data.stats,
            });
          }
        });

        // 정렬
        teamsData.sort((a, b) => {
          switch (sortBy) {
            case 'winRate':
              // 승률이 같으면 경기 수가 많은 순
              if (b.stats.winRate === a.stats.winRate) {
                return b.stats.games - a.stats.games;
              }
              return b.stats.winRate - a.stats.winRate;
            
            case 'goalDiff':
              // 득실차가 같으면 승률 순
              if (b.stats.goalDiff === a.stats.goalDiff) {
                return b.stats.winRate - a.stats.winRate;
              }
              return b.stats.goalDiff - a.stats.goalDiff;
            
            case 'wins':
              // 승수가 같으면 승률 순
              if (b.stats.wins === a.stats.wins) {
                return b.stats.winRate - a.stats.winRate;
              }
              return b.stats.wins - a.stats.wins;
            
            case 'games':
              // 경기 수가 같으면 승률 순
              if (b.stats.games === a.stats.games) {
                return b.stats.winRate - a.stats.winRate;
              }
              return b.stats.games - a.stats.games;
            
            default:
              return 0;
          }
        });

        setTeams(teamsData);
      } catch (error) {
        console.error('랭킹 조회 실패:', error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    loadRankings();
  }, [sortBy, sportFilter, minGames]);

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

  const getStreakIcon = (streakType: string) => {
    if (streakType === 'win') {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (streakType === 'loss') {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    } else if (streakType === 'draw') {
      return <Minus className="w-4 h-4 text-gray-600" />;
    }
    return null;
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
      <div className="w-full max-w-none md:mx-auto md:max-w-6xl py-6 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">팀 랭킹</h1>
          <p className="text-gray-600">전체 팀의 성적을 확인하세요</p>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* 정렬 기준 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">정렬 기준</label>
              <div className="flex gap-2">
                {(['winRate', 'goalDiff', 'wins', 'games'] as SortBy[]).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      sortBy === sort
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sort === 'winRate' ? '승률' : 
                     sort === 'goalDiff' ? '득실차' : 
                     sort === 'wins' ? '승수' : '경기 수'}
                  </button>
                ))}
              </div>
            </div>

            {/* 종목 필터 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">종목</label>
              <div className="flex gap-2">
                {(['all', 'football', 'basketball', 'baseball'] as SportFilter[]).map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setSportFilter(sport)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      sportFilter === sport
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sport === 'all' ? '전체' : getSportLabel(sport)}
                  </button>
                ))}
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
        {teams.length === 0 ? (
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
                    팀명
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    경기
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    승/무/패
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    승률
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    득점/실점
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    득실차
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연속
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teams.map((team, index) => {
                  const rank = index + 1;
                  const winRatePercent = (team.stats.winRate * 100).toFixed(1);

                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/teams/${encodeURIComponent(team.id)}/play`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {getRankIcon(rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {team.logo && (
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="w-10 h-10 rounded-full mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{team.name}</div>
                            <div className="text-sm text-gray-500">
                              {getSportLabel(team.sportType)} · {team.region}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {team.stats.games}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {team.stats.wins}승 {team.stats.draws}무 {team.stats.losses}패
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-gray-900">
                          {winRatePercent}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {team.stats.goalsFor} / {team.stats.goalsAgainst}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`text-sm font-semibold ${
                            team.stats.goalDiff >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {team.stats.goalDiff >= 0 ? '+' : ''}{team.stats.goalDiff}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {team.stats.streakType !== 'none' && team.stats.streakCount > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            {getStreakIcon(team.stats.streakType)}
                            <span className="text-sm text-gray-600">
                              {team.stats.streakCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
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
