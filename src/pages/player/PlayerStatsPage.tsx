/**
 * 🔥 선수 통계 페이지
 * 
 * 경로: /players/:playerId/stats
 * 
 * 역할:
 * - 선수 누적 통계 표시
 * - 경기별 기록 목록
 * - 통계 요약
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPlayerStats } from '@/services/playerStatsService';
import { getPlayerGameStats } from '@/services/playerGameStatsService';
import type { PlayerStats } from '@/types/playerStats';
import type { PlayerGameStats } from '@/types/playerStats';
import { Trophy, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function PlayerStatsPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [playerGameStats, setPlayerGameStats] = useState<PlayerGameStats[]>([]);
  const [playerName, setPlayerName] = useState<string>('');

  useEffect(() => {
    if (!playerId) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // 선수 통계 조회
        const stats = await getPlayerStats(playerId);
        setPlayerStats(stats);

        // 선수 경기 기록 조회
        const gameStats = await getPlayerGameStats(playerId);
        setPlayerGameStats(gameStats);

        // 사용자 이름 조회
        const userRef = doc(db, 'users', playerId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setPlayerName(userData.displayName || userData.name || playerId);
        } else {
          setPlayerName(playerId);
        }
      } catch (error) {
        console.error('선수 통계 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [playerId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!playerStats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">통계 데이터가 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  const goalsPerGame = playerStats.games > 0 ? (playerStats.goals / playerStats.games).toFixed(2) : '0.00';
  const assistsPerGame = playerStats.games > 0 ? (playerStats.assists / playerStats.games).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{playerName} 통계</h1>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* 경기 수 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">경기 수</div>
            <div className="text-3xl font-bold">{playerStats.games}</div>
          </div>

          {/* 득점 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">득점</div>
            <div className="text-3xl font-bold text-blue-600">{playerStats.goals}</div>
            <div className="text-sm text-gray-500 mt-2">
              경기당 {goalsPerGame}골
            </div>
          </div>

          {/* 어시스트 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-2">어시스트</div>
            <div className="text-3xl font-bold text-green-600">{playerStats.assists}</div>
            <div className="text-sm text-gray-500 mt-2">
              경기당 {assistsPerGame}개
            </div>
          </div>
        </div>

        {/* 추가 통계 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">상세 통계</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">슛</div>
              <div className="text-xl font-semibold">{playerStats.shots || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">패스</div>
              <div className="text-xl font-semibold">{playerStats.passes || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">경고</div>
              <div className="text-xl font-semibold text-yellow-600">{playerStats.yellowCards}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">퇴장</div>
              <div className="text-xl font-semibold text-red-600">{playerStats.redCards}</div>
            </div>
          </div>
        </div>

        {/* 경기별 기록 */}
        {playerGameStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">경기별 기록</h2>
            <div className="space-y-3">
              {playerGameStats
                .sort((a, b) => {
                  const aTime = a.createdAt?.toMillis() || 0;
                  const bTime = b.createdAt?.toMillis() || 0;
                  return bTime - aTime;
                })
                .map((gameStat) => (
                  <div
                    key={gameStat.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {gameStat.goals > 0 && (
                          <span className="text-blue-600 font-semibold">
                            {gameStat.goals}골
                          </span>
                        )}
                        {gameStat.assists > 0 && (
                          <span className="text-green-600 font-semibold">
                            {gameStat.assists}어시스트
                          </span>
                        )}
                        {gameStat.goals === 0 && gameStat.assists === 0 && (
                          <span className="text-gray-400">기록 없음</span>
                        )}
                      </div>
                      {gameStat.minutesPlayed > 0 && (
                        <div className="text-sm text-gray-600">
                          {gameStat.minutesPlayed}분 출전
                        </div>
                      )}
                    </div>
                    {gameStat.createdAt && (
                      <div className="text-sm text-gray-500">
                        {format(gameStat.createdAt.toDate(), 'yyyy년 MM월 dd일', { locale: ko })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
