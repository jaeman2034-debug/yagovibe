/**
 * 🔥 리그 목록 페이지
 * 
 * 경로: /leagues
 * 
 * 역할:
 * - 리그 목록 표시
 * - 상태별 필터링
 * - 종목별 필터링
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagues } from '@/services/leagueService';
import type { League } from '@/types/league';
import { Trophy, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type StatusFilter = 'all' | 'registration' | 'active' | 'completed';
type SportFilter = 'all' | 'football' | 'basketball' | 'baseball';

export default function LeagueListPage() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');

  useEffect(() => {
    const loadLeagues = async () => {
      try {
        setLoading(true);
        
        const leagueList = await getLeagues({
          sportType: sportFilter !== 'all' ? sportFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        });
        
        setLeagues(leagueList);
      } catch (error) {
        console.error('리그 목록 조회 실패:', error);
        setLeagues([]);
      } finally {
        setLoading(false);
      }
    };

    loadLeagues();
  }, [statusFilter, sportFilter]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      registration: '참가 모집',
      active: '진행중',
      completed: '종료',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      registration: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">리그</h1>
            <Button
              onClick={() => navigate('/leagues/create')}
            >
              리그 생성
            </Button>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">상태</label>
              <div className="flex gap-2">
                {(['all', 'registration', 'active', 'completed'] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      statusFilter === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? '전체' : getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
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
          </div>
        </div>

        {/* 리그 목록 */}
        {leagues.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">등록된 리그가 없습니다.</p>
            <Button
              onClick={() => navigate('/leagues/create')}
              variant="outline"
            >
              첫 리그 생성하기
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(league.status)}`}>
                        {getStatusLabel(league.status)}
                      </span>
                      <span className="text-sm text-gray-600">{getSportLabel(league.sportType)}</span>
                      <span className="text-sm text-gray-600">{league.season} 시즌</span>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">{league.name}</h2>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{league.region}</span>
                      </div>
                      {league.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(league.startDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })} ~{' '}
                            {format(league.endDate.toDate(), 'yyyy년 MM월 dd일', { locale: ko })}
                          </span>
                        </div>
                      )}
                    </div>
                    {league.description && (
                      <p className="text-sm text-gray-600 mt-3">{league.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
