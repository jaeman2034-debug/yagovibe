/**
 * 🔥 팀 경기 결과 입력 페이지
 * 
 * 경로: /teams/:teamId/games/:gameId/edit
 * 
 * 역할:
 * - 경기 결과 입력 (점수)
 * - 경기 완료 처리
 * - 권한: owner/admin만
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { getTeamGame, completeTeamGame } from '@/services/teamGameService';
import type { TeamGame } from '@/types/teamGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function TeamGameEditPage() {
  const { teamId, gameId } = useParams<{ teamId: string; gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState<TeamGame | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // 폼 상태
  const [homeScore, setHomeScore] = useState<number | ''>('');
  const [awayScore, setAwayScore] = useState<number | ''>('');
  const [playedAt, setPlayedAt] = useState('');
  const [playedTime, setPlayedTime] = useState('');
  const [notes, setNotes] = useState('');

  // 권한 체크 및 경기 정보 로드
  useEffect(() => {
    if (!teamId || !gameId || !user) {
      navigate(`/teams/${teamId}/games`);
      return;
    }

    const loadGame = async () => {
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

        // 이미 완료된 경기는 수정 불가
        if (gameData.status === 'completed') {
          alert('이미 완료된 경기입니다.');
          navigate(`/teams/${teamId}/games`);
          return;
        }

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
            
            // 기존 점수가 있으면 표시
            if (gameData.homeScore !== undefined) {
              setHomeScore(gameData.homeScore);
            }
            if (gameData.awayScore !== undefined) {
              setAwayScore(gameData.awayScore);
            }
            if (gameData.playedAt) {
              const playedDate = gameData.playedAt.toDate();
              setPlayedAt(format(playedDate, 'yyyy-MM-dd'));
              setPlayedTime(format(playedDate, 'HH:mm'));
            }
            if (gameData.notes) {
              setNotes(gameData.notes);
            }
          } else {
            navigate(`/teams/${teamId}/games`);
          }
        } else {
          navigate(`/teams/${teamId}/games`);
        }
      } catch (error) {
        console.error('경기 정보 로드 실패:', error);
        navigate(`/teams/${teamId}/games`);
      } finally {
        setLoading(false);
        setCheckingPermission(false);
      }
    };

    loadGame();
  }, [teamId, gameId, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameId || !user || homeScore === '' || awayScore === '') {
      alert('점수를 입력해주세요.');
      return;
    }

    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return;
    }

    try {
      setSaving(true);

      // 날짜 + 시간 결합
      let playedAtDate: Date | undefined;
      if (playedAt) {
        playedAtDate = new Date(`${playedAt}T${playedTime || '00:00'}`);
      }

      await completeTeamGame(gameId, {
        homeScore,
        awayScore,
        playedAt: playedAtDate,
        recordedBy: user.uid,
      });

      // 통계는 Cloud Function이 자동으로 업데이트
      navigate(`/teams/${teamId}/games`);
    } catch (error: any) {
      console.error('경기 결과 저장 실패:', error);
      alert(error.message || '경기 결과 저장에 실패했습니다.');
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
  const myTeamName = isHome ? game.homeTeamName : game.awayTeamName;
  const opponentName = isHome ? game.awayTeamName : game.homeTeamName;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-2xl py-6 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${teamId}/games`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            경기 목록으로 돌아가기
          </button>
          <h1 className="text-2xl font-bold">경기 결과 입력</h1>
        </div>

        {/* 경기 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-lg font-semibold mb-2">
              {game.homeTeamName} vs {game.awayTeamName}
            </div>
            {game.scheduledAt && (
              <div className="text-sm text-gray-600">
                {format(game.scheduledAt.toDate(), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
              </div>
            )}
            {game.location && (
              <div className="text-sm text-gray-600 mt-1">
                {game.location}
              </div>
            )}
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 점수 입력 */}
          <div>
            <Label className="text-lg font-semibold mb-4 block">점수 입력 *</Label>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">{game.homeTeamName}</div>
                <Input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                    setHomeScore(val as any);
                  }}
                  className="text-center text-2xl font-bold"
                  required
                />
              </div>
              <div className="text-center text-3xl font-bold text-gray-400">:</div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">{game.awayTeamName}</div>
                <Input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                    setAwayScore(val as any);
                  }}
                  className="text-center text-2xl font-bold"
                  required
                />
              </div>
            </div>
            
            {/* 승리 예측 표시 */}
            {typeof homeScore === 'number' && typeof awayScore === 'number' && (
              <div className="mt-4 text-center">
                {homeScore > awayScore ? (
                  <div className="inline-flex items-center gap-2 text-blue-600 font-semibold">
                    <Trophy className="w-5 h-5" />
                    {game.homeTeamName} 승리
                  </div>
                ) : homeScore < awayScore ? (
                  <div className="inline-flex items-center gap-2 text-blue-600 font-semibold">
                    <Trophy className="w-5 h-5" />
                    {game.awayTeamName} 승리
                  </div>
                ) : (
                  <div className="text-gray-600 font-semibold">무승부</div>
                )}
              </div>
            )}
          </div>

          {/* 실제 경기 일시 */}
          <div>
            <Label htmlFor="playedAt">실제 경기 일시</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                id="playedAt"
                type="date"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
              />
              <Input
                type="time"
                value={playedTime}
                onChange={(e) => setPlayedTime(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              비워두면 현재 시각으로 저장됩니다.
            </p>
          </div>

          {/* 메모 */}
          <div>
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              placeholder="경기 관련 메모를 입력하세요"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-4">
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
              disabled={saving || homeScore === '' || awayScore === ''}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                '경기 결과 저장'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
