/**
 * 🔥 리그 경기 생성 페이지
 * 
 * 경로: /leagues/:leagueId/games/create
 * 
 * 역할:
 * - 리그 경기 생성
 * - Round-Robin 자동 생성 옵션
 * - 권한: 리그 생성자 또는 관리자
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { getLeague, getLeagueTeams, createLeagueGame } from '@/services/leagueService';
import { generateRoundRobin, generateDoubleRoundRobin } from '@/utils/roundRobin';
import type { League, LeagueTeam } from '@/types/league';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LeagueGameCreatePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

  // 폼 상태
  const [mode, setMode] = useState<'manual' | 'roundRobin'>('manual');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [round, setRound] = useState(1);

  useEffect(() => {
    if (!leagueId || !user) {
      navigate('/leagues');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const [leagueData, teamsData] = await Promise.all([
          getLeague(leagueId),
          getLeagueTeams(leagueId),
        ]);

        if (!leagueData) {
          navigate('/leagues');
          return;
        }

        setLeague(leagueData);
        setTeams(teamsData);

        // 권한 체크: 리그 생성자만
        if (leagueData.createdBy === user.uid) {
          setHasPermission(true);
        } else {
          navigate(`/leagues/${leagueId}`);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        navigate('/leagues');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leagueId, user, navigate]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leagueId || !user || !homeTeamId || !awayTeamId || !scheduledAt) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    if (homeTeamId === awayTeamId) {
      alert('같은 팀끼리는 경기를 생성할 수 없습니다.');
      return;
    }

    try {
      setSaving(true);

      const scheduledDateTime = new Date(`${scheduledAt}T${scheduledTime || '00:00'}`);

      await createLeagueGame({
        leagueId,
        homeTeamId,
        awayTeamId,
        scheduledAt: scheduledDateTime,
        round,
        createdBy: user.uid,
      });

      navigate(`/leagues/${leagueId}`);
    } catch (error: any) {
      console.error('경기 생성 실패:', error);
      alert(error.message || '경기 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoundRobinSubmit = async () => {
    if (!leagueId || !user || teams.length < 2) {
      alert('참가 팀이 2팀 이상 필요합니다.');
      return;
    }

    if (!confirm(`모든 팀이 한 번씩 경기하는 대진표를 생성하시겠습니까? (총 ${teams.length * (teams.length - 1) / 2}경기)`)) {
      return;
    }

    try {
      setSaving(true);

      const teamIds = teams.map((t) => t.teamId);
      const matches = generateRoundRobin(teamIds);

      // 각 경기 생성
      for (const match of matches) {
        await createLeagueGame({
          leagueId,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          scheduledAt: new Date(), // 기본값, 나중에 수정 가능
          round: match.round,
          createdBy: user.uid,
        });
      }

      alert(`${matches.length}경기가 생성되었습니다.`);
      navigate(`/leagues/${leagueId}`);
    } catch (error: any) {
      console.error('대진표 생성 실패:', error);
      alert(error.message || '대진표 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!hasPermission || !league) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/leagues/${leagueId}`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            리그 상세로 돌아가기
          </button>
          <h1 className="text-2xl font-bold">리그 경기 생성</h1>
          <p className="text-gray-600 mt-1">{league.name}</p>
        </div>

        {/* 모드 선택 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-2 rounded-md ${
                mode === 'manual'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              수동 생성
            </button>
            <button
              onClick={() => setMode('roundRobin')}
              className={`flex-1 px-4 py-2 rounded-md ${
                mode === 'roundRobin'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Round-Robin 자동 생성
            </button>
          </div>
        </div>

        {/* 수동 생성 폼 */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* 홈팀 */}
            <div>
              <Label htmlFor="homeTeamId">홈팀 *</Label>
              <select
                id="homeTeamId"
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">선택하세요</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>

            {/* 원정팀 */}
            <div>
              <Label htmlFor="awayTeamId">원정팀 *</Label>
              <select
                id="awayTeamId"
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">선택하세요</option>
                {teams
                  .filter((team) => team.teamId !== homeTeamId)
                  .map((team) => (
                    <option key={team.id} value={team.teamId}>
                      {team.teamName}
                    </option>
                  ))}
              </select>
            </div>

            {/* 라운드 */}
            <div>
              <Label htmlFor="round">라운드</Label>
              <Input
                id="round"
                type="number"
                min="1"
                value={round}
                onChange={(e) => setRound(parseInt(e.target.value) || 1)}
                className="mt-2"
              />
            </div>

            {/* 일정 */}
            <div>
              <Label htmlFor="scheduledAt">경기 일정 *</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  id="scheduledAt"
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={today}
                  required
                />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/leagues/${leagueId}`)}
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
                    생성 중...
                  </>
                ) : (
                  '경기 생성'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Round-Robin 자동 생성 */}
        {mode === 'roundRobin' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Round-Robin 대진표</h3>
              <p className="text-sm text-gray-600">
                참가 팀: {teams.length}팀
              </p>
              <p className="text-sm text-gray-600">
                예상 경기 수: {teams.length * (teams.length - 1) / 2}경기
              </p>
            </div>

            {teams.length < 2 ? (
              <p className="text-gray-600 text-center py-8">
                참가 팀이 2팀 이상 필요합니다.
              </p>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleRoundRobinSubmit}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      생성 중...
                    </>
                  ) : (
                    '대진표 자동 생성'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
