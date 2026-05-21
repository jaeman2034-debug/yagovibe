/**
 * 🔥 경기별 선수 기록 입력 페이지
 * 
 * 경로: /teams/:teamId/games/:gameId/players
 * 
 * 역할:
 * - 경기별 선수 기록 입력
 * - 팀 멤버 목록 표시
 * - 득점/어시스트/카드 입력
 * - 권한: owner/admin만
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTeamGame } from '@/services/teamGameService';
import {
  getTeamGamePlayerStats,
  createPlayerGameStats,
  updatePlayerGameStats,
} from '@/services/playerGameStatsService';
import type { TeamGame } from '@/types/teamGame';
import type { PlayerGameStats } from '@/types/playerStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

interface TeamMember {
  userId: string;
  name?: string;
  role: string;
}

interface PlayerStatsForm {
  playerId: string;
  playerName: string;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
  existingStatsId?: string;
}

export default function GamePlayerStatsPage() {
  const { teamId, gameId } = useParams<{ teamId: string; gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState<TeamGame | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [existingStats, setExistingStats] = useState<PlayerGameStats[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // 폼 상태 (선수별)
  const [playerForms, setPlayerForms] = useState<Record<string, PlayerStatsForm>>({});

  // 권한 체크 및 데이터 로드
  useEffect(() => {
    if (!teamId || !gameId || !user) {
      navigate(`/teams/${teamId}/games`);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setCheckingPermission(true);

        // 경기 정보 조회
        const gameData = await getTeamGame(gameId);
        if (!gameData) {
          navigate(`/teams/${teamId}/games`);
          return;
        }

        setGame(gameData);

        // 권한 체크: owner 또는 admin
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          navigate(`/teams/${teamId}/games`);
          return;
        }

        const teamData = teamSnap.data();
        const memberRef = doc(db, 'teams', teamId, 'members', user.uid);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          const memberData = memberSnap.data();
          const role = memberData.role;
          const isOwner = teamData.ownerUid === user.uid;
          const isAdmin = role === 'admin' || role === 'owner';

          if (isOwner || isAdmin) {
            setHasPermission(true);

            // 팀 멤버 목록 조회
            const membersRef = collection(db, 'teams', teamId, 'members');
            const membersSnap = await getDocs(membersRef);
            const members: TeamMember[] = [];

            membersSnap.forEach((doc) => {
              const data = doc.data();
              if (data.status === 'active') {
                members.push({
                  userId: doc.id,
                  name: data.name || data.userId,
                  role: data.role,
                });
              }
            });

            setTeamMembers(members);

            // 기존 기록 조회
            const existing = await getTeamGamePlayerStats(gameId, teamId);
            setExistingStats(existing);

            // 폼 초기화
            const forms: Record<string, PlayerStatsForm> = {};
            members.forEach((member) => {
              const existingStat = existing.find((s) => s.playerId === member.userId);
              forms[member.userId] = {
                playerId: member.userId,
                playerName: member.name || member.userId,
                goals: existingStat?.goals || 0,
                assists: existingStat?.assists || 0,
                shots: existingStat?.shots || 0,
                passes: existingStat?.passes || 0,
                minutesPlayed: existingStat?.minutesPlayed || 0,
                yellowCards: existingStat?.yellowCards || 0,
                redCards: existingStat?.redCards || 0,
                existingStatsId: existingStat?.id,
              };
            });
            setPlayerForms(forms);
          } else {
            navigate(`/teams/${teamId}/games`);
          }
        } else {
          navigate(`/teams/${teamId}/games`);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        navigate(`/teams/${teamId}/games`);
      } finally {
        setLoading(false);
        setCheckingPermission(false);
      }
    };

    loadData();
  }, [teamId, gameId, user, navigate]);

  const handlePlayerFormChange = (
    playerId: string,
    field: keyof PlayerStatsForm,
    value: number
  ) => {
    setPlayerForms((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameId || !teamId || !user || !game) {
      return;
    }

    try {
      setSaving(true);

      const promises = Object.values(playerForms).map(async (form) => {
        const statsData = {
          gameId,
          teamId,
          playerId: form.playerId,
          sportType: game.sportType,
          goals: form.goals,
          assists: form.assists,
          shots: form.shots,
          passes: form.passes,
          minutesPlayed: form.minutesPlayed,
          yellowCards: form.yellowCards,
          redCards: form.redCards,
          recordedBy: user.uid,
        };

        if (form.existingStatsId) {
          // 기존 기록 수정
          await updatePlayerGameStats(form.existingStatsId, statsData);
        } else if (form.goals > 0 || form.assists > 0 || form.shots > 0 || form.passes > 0 || form.minutesPlayed > 0) {
          // 새 기록 생성 (기록이 있는 경우만)
          await createPlayerGameStats(statsData);
        }
      });

      await Promise.all(promises);

      // 통계는 Cloud Function이 자동으로 업데이트
      navigate(`/teams/${teamId}/games`);
    } catch (error: any) {
      console.error('선수 기록 저장 실패:', error);
      alert(error.message || '선수 기록 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || checkingPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!hasPermission || !game) {
    return null;
  }

  const isHome = game.homeTeamId === teamId;
  const opponentName = isHome ? game.awayTeamName : game.homeTeamName;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${teamId}/games/${gameId}/edit`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            경기 결과로 돌아가기
          </button>
          <h1 className="text-2xl font-bold">선수 기록 입력</h1>
          <p className="text-gray-600 mt-1">
            {game.homeTeamName} vs {opponentName}
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">선수</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">득점</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">어시스트</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">슛</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">패스</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">출전시간</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">경고</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">퇴장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamMembers.map((member) => {
                  const form = playerForms[member.userId];
                  if (!form) return null;

                  return (
                    <tr key={member.userId}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {form.playerName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={form.goals}
                          onChange={(e) =>
                            handlePlayerFormChange(member.userId, 'goals', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={form.assists}
                          onChange={(e) =>
                            handlePlayerFormChange(member.userId, 'assists', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={form.shots}
                          onChange={(e) =>
                            handlePlayerFormChange(member.userId, 'shots', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={form.passes}
                          onChange={(e) =>
                            handlePlayerFormChange(member.userId, 'passes', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          max="90"
                          value={form.minutesPlayed}
                          onChange={(e) =>
                            handlePlayerFormChange(member.userId, 'minutesPlayed', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          max="2"
                          value={form.yellowCards}
                          onChange={(e) =>
                            handlePlayerFormChange(member.userId, 'yellowCards', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          value={form.redCards}
                          onChange={(e) =>
                            handlePlayerFormChange(member.userId, 'redCards', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-center"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 제출 버튼 */}
          <div className="mt-6 flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/teams/${teamId}/games`)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
