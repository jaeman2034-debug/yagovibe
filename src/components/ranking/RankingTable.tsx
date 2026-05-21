/**
 * 🔥 랭킹 테이블 컴포넌트
 * 
 * 역할:
 * - 팀 랭킹 테이블 표시
 * - 순위, 팀명, 통계 표시
 */

import { Trophy } from 'lucide-react';

export interface TeamRankingRow {
  id: string;
  name: string;
  sportType: string;
  region: string;
  logo?: string;
  stats: {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    winRate: number;
  };
}

interface RankingTableProps {
  teams: TeamRankingRow[];
  onTeamClick?: (teamId: string) => void;
}

export function RankingTable({ teams, onTeamClick }: RankingTableProps) {
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

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">랭킹 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Team
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Games
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              W
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              D
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              L
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              GF
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              GA
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              GD
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Win%
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {teams.map((team, index) => {
            const rank = index + 1;
            const winRatePercent = Math.round(team.stats.winRate * 100);

            return (
              <tr
                key={team.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onTeamClick?.(team.id)}
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
                      <div className="text-sm text-gray-500">{team.region}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {team.stats.games}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {team.stats.wins}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {team.stats.draws}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {team.stats.losses}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {team.stats.goalsFor}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {team.stats.goalsAgainst}
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
                  <span className="text-sm font-semibold text-gray-900">
                    {winRatePercent}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
