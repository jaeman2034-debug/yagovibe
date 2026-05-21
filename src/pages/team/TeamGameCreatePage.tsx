/**
 * 🔥 팀 경기 생성 페이지
 * 
 * 경로: /teams/:teamId/games/create
 * 
 * 역할:
 * - 경기 생성 폼
 * - 상대팀 선택
 * - 일정 선택
 * - 경기장 선택
 * - 경기 유형 선택
 * - 권한: owner/admin만
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { createTeamGame } from '@/services/teamGameService';
import { teamPlayEntryPath } from '@/lib/team/teamPlayRoutes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TRACK } from '@/lib/analytics';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AwayTeamRow = { id: string; name: string };

export default function TeamGameCreatePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // 폼 상태
  const [awayTeamId, setAwayTeamId] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [gameType, setGameType] = useState<'friendly' | 'league' | 'tournament' | 'scrimmage'>('friendly');
  const [notes, setNotes] = useState('');
  const [awayTeamCandidates, setAwayTeamCandidates] = useState<AwayTeamRow[]>([]);
  const [awaySearchLoading, setAwaySearchLoading] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!teamId || !user) {
      navigate('/me');
      return;
    }

    const checkPermission = async () => {
      try {
        // 팀 정보 조회
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          navigate('/me');
          return;
        }

        const teamData = teamSnap.data();

        // 권한 체크: owner 또는 admin
        const memberRef = doc(db, 'teams', teamId, 'members', user.uid);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          const memberData = memberSnap.data();
          const role = memberData.role;
          const isOwner = teamData.ownerUid === user.uid;
          const isAdmin = role === 'admin' || role === 'owner';

          if (isOwner || isAdmin) {
            setHasPermission(true);
          } else {
            navigate(`/teams/${teamId}/manage`);
          }
        } else {
          navigate(`/teams/${teamId}/manage`);
        }
      } catch (error) {
        console.error('권한 체크 실패:', error);
        navigate('/me');
      } finally {
        setCheckingPermission(false);
      }
    };

    checkPermission();
  }, [teamId, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId || !user) {
      toast.error('로그인 상태를 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    if (!scheduledAt?.trim()) {
      toast.error('경기 일정(날짜)을 선택해 주세요.');
      return;
    }
    if (!awayTeamId.trim()) {
      toast.error('상대팀은 아래 검색 목록에서 팀을 눌러 선택해야 해요. 이름만 입력된 상태로는 등록할 수 없어요.');
      return;
    }

    try {
      setLoading(true);

      // 날짜 + 시간 결합
      const scheduledDateTime = new Date(`${scheduledAt}T${scheduledTime || '00:00'}`);

      const newGameId = await createTeamGame({
        homeTeamId: teamId,
        awayTeamId,
        scheduledAt: scheduledDateTime,
        location: location || undefined,
        address: address || undefined,
        gameType,
        createdBy: user.uid,
        notes: notes || undefined,
      });

      TRACK('GAME_CREATED', {
        team_id: teamId,
        game_id: newGameId,
        game_type: gameType,
      });

      toast.success('⚽ 경기 생성 완료!', {
        description: `${awayTeamName}와의 일정이 등록됐어요. 플레이 화면에서 방금 만든 경기 안내를 확인할 수 있어요.`,
        duration: 3200,
      });

      await new Promise((r) => window.setTimeout(r, 420));
      navigate(teamPlayEntryPath(teamId), {
        state: {
          justCreatedGameId: newGameId,
          justCreatedAwayName: awayTeamName,
        },
      });
    } catch (error: any) {
      console.error('경기 생성 실패:', error);
      alert(error.message || '경기 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /** 이름 접두 검색 → 목록에서만 선택 (자동 확정 없음) */
  useEffect(() => {
    if (awayTeamId.trim()) {
      setAwaySearchLoading(false);
      return;
    }

    const q = awayTeamName.trim();
    if (q.length < 2) {
      setAwayTeamCandidates([]);
      setAwaySearchLoading(false);
      return;
    }

    setAwaySearchLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const teamsRef = collection(db, 'teams');
        const qy = query(
          teamsRef,
          where('name', '>=', q),
          where('name', '<=', q + '\uf8ff'),
          limit(24)
        );
        const snapshot = await getDocs(qy);
        const tid = teamId?.trim() ?? '';
        const list: AwayTeamRow[] = snapshot.docs
          .map((d) => ({
            id: d.id,
            name: String((d.data() as { name?: string }).name ?? '').trim() || '(이름 없음)',
          }))
          .filter((row) => !tid || row.id !== tid);
        setAwayTeamCandidates(list);
      } catch (error) {
        console.error('팀 검색 실패:', error);
        setAwayTeamCandidates([]);
        toast.error('상대팀 검색에 실패했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setAwaySearchLoading(false);
      }
    }, 320);

    return () => window.clearTimeout(handle);
  }, [awayTeamName, teamId, awayTeamId]);

  const selectAwayTeam = (row: AwayTeamRow) => {
    setAwayTeamId(row.id);
    setAwayTeamName(row.name);
    setAwayTeamCandidates([]);
  };

  if (checkingPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!hasPermission) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const canSubmit =
    Boolean(teamId?.trim()) && Boolean(awayTeamId.trim()) && Boolean(scheduledAt?.trim()) && !loading;

  const submitButtonLabel = loading
    ? "등록 중..."
    : !awayTeamId.trim()
      ? "상대팀 선택 필요"
      : !scheduledAt?.trim()
        ? "경기 일정 선택 필요"
        : "경기 생성하기";

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
          <h1 className="text-2xl font-bold">경기 등록</h1>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 상대팀 */}
          <div>
            <Label htmlFor="awayTeam">상대팀 *</Label>
            <p className="mt-1 text-xs text-gray-500">
              이름을 입력해 검색한 뒤, <span className="font-semibold text-gray-700">아래 목록에서 반드시 팀을 눌러 선택</span>해야 해요.
            </p>
            <div className="relative mt-2 space-y-2">
              <Input
                id="awayTeam"
                type="text"
                placeholder="예: 서울 · 검색 후 목록에서 선택"
                value={awayTeamName}
                onChange={(e) => {
                  setAwayTeamName(e.target.value);
                  setAwayTeamId('');
                }}
                autoComplete="off"
                required
              />
              {awaySearchLoading ? (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  팀 검색 중…
                </p>
              ) : null}
              {!awaySearchLoading && awayTeamName.trim().length >= 2 && awayTeamCandidates.length > 0 && !awayTeamId ? (
                <ul
                  className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                  role="listbox"
                  aria-label="상대팀 검색 결과"
                >
                  {awayTeamCandidates.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-violet-50 active:bg-violet-100"
                        onClick={() => selectAwayTeam(row)}
                      >
                        <span className="font-medium text-gray-900">{row.name}</span>
                        <span className="shrink-0 text-[10px] text-gray-400">선택</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!awaySearchLoading && awayTeamName.trim().length >= 2 && awayTeamCandidates.length === 0 && !awayTeamId ? (
                <p className="text-sm text-amber-700">
                  일치하는 팀이 없어요. 등록된 팀 이름 <span className="font-semibold">앞글자부터</span> 입력해 보세요. (우리 팀은 상대로
                  선택할 수 없어요)
                </p>
              ) : null}
              {awayTeamId ? (
                <div className="mt-1 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50/40 p-3 shadow-sm ring-1 ring-emerald-500/15">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-800">🎯 상대팀 선택 완료</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-black text-white shadow-md shadow-violet-900/20"
                      aria-hidden
                    >
                      {(awayTeamName.trim().slice(0, 1) || "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-gray-900">{awayTeamName}</p>
                      <p className="mt-0.5 text-xs font-medium text-emerald-800/90">⚽ 경기 상대 확정</p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* 경기 유형 */}
          <div>
            <Label htmlFor="gameType">경기 유형 *</Label>
            <select
              id="gameType"
              value={gameType}
              onChange={(e) => setGameType(e.target.value as any)}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="friendly">친선전</option>
              <option value="league">리그전</option>
              <option value="tournament">토너먼트</option>
              <option value="scrimmage">연습경기</option>
            </select>
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

          {/* 경기장 */}
          <div>
            <Label htmlFor="location">경기장 이름</Label>
            <Input
              id="location"
              type="text"
              placeholder="예: 노원구 풋살장"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* 주소 */}
          <div>
            <Label htmlFor="address">경기장 주소</Label>
            <Input
              id="address"
              type="text"
              placeholder="예: 서울시 노원구..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-2"
            />
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
              disabled={!canSubmit}
              className="flex-1 font-semibold transition-transform active:scale-[0.97] active:duration-75"
              title={
                canSubmit
                  ? "입력한 일정으로 경기를 생성합니다"
                  : !awayTeamId.trim()
                    ? "검색 목록에서 상대 팀을 먼저 선택해 주세요"
                    : "경기 날짜를 선택해 주세요"
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {submitButtonLabel}
                </>
              ) : (
                submitButtonLabel
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
