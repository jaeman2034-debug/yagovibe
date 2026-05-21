/**
 * 🔥 팀 랭킹 페이지
 * 
 * 경로: /sports/:sportType/ranking
 * 
 * 역할:
 * - teams.stats 기반 팀 랭킹 표시
 * - 종목별 랭킹 조회
 * - 랭킹 테이블 표시
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeamRanking } from '@/services/rankingService';
import { RankingTable } from '@/components/ranking/RankingTable';
import { Trophy } from 'lucide-react';

export default function TeamRankingPage() {
  const { sportType } = useParams<{ sportType: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sportType) {
      setError('종목 정보가 없습니다.');
      setLoading(false);
      return;
    }

    const loadRanking = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const ranking = await getTeamRanking(sportType);
        setTeams(ranking);
      } catch (err: any) {
        console.error('랭킹 조회 실패:', err);
        setError(err.message || '랭킹을 불러올 수 없습니다.');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [sportType]);

  const getSportLabel = (sport: string) => {
    const labels: Record<string, string> = {
      football: '축구',
      basketball: '농구',
      baseball: '야구',
      futsal: '풋살',
    };
    return labels[sport] || sport;
  };

  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${encodeURIComponent(teamId)}/play`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline"
          >
            홈으로 돌아가기
          </button>
        </div>
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
              {getSportLabel(sportType || '')} 팀 랭킹
            </h1>
          </div>
          <p className="text-gray-600">
            정렬 기준: 승률 → 득실차 → 승수
          </p>
        </div>

        {/* 랭킹 테이블 */}
        <RankingTable teams={teams} onTeamClick={handleTeamClick} />
      </div>
    </div>
  );
}
