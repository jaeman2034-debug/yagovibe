/**
 * 출전 쿼터 입력 — team_games.playParticipation 저장
 *
 * 경로: /teams/:teamId/games/:gameId/participation
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamGame, TeamGamePlayParticipationEntry } from "@/types/teamGame";
import { getTeamGame, updateTeamGamePlayParticipation } from "@/services/teamGameService";
import { normalizeQuarterMinutePlan } from "@/lib/play/teamGameParticipation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const Q_LABELS = ["1쿼터", "2쿼터", "3쿼터", "4쿼터"] as const;

type Row = {
  memberId: string;
  label: string;
};

function flagsFromEntry(e: TeamGamePlayParticipationEntry): boolean[] {
  const flags = [false, false, false, false];
  let n =
    typeof e.quartersPlayed === "number" && e.quartersPlayed > 0
      ? Math.min(4, Math.round(e.quartersPlayed))
      : 0;
  if (!n && typeof e.minutesPlayed === "number" && e.minutesPlayed > 0) {
    n = Math.min(4, Math.max(1, Math.round(e.minutesPlayed / 15)));
  }
  for (let i = 0; i < n; i++) flags[i] = true;
  return flags;
}

export default function TeamGameParticipationPage() {
  const { teamId, gameId } = useParams<{ teamId: string; gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState<TeamGame | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [flagsByMember, setFlagsByMember] = useState<Record<string, boolean[]>>({});
  const [quarterPlan, setQuarterPlan] = useState<number[]>([15, 15, 15, 15]);

  const canEdit = useMemo(() => game?.status === "completed" && hasPermission, [game?.status, hasPermission]);

  useEffect(() => {
    if (!teamId || !gameId || !user) {
      navigate(teamId ? `/teams/${teamId}/manage` : "/me", { replace: true });
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        const g = await getTeamGame(gameId);
        if (!g) {
          toast.error("경기를 찾을 수 없어요.");
          navigate(`/teams/${teamId}/games`, { replace: true });
          return;
        }
        setGame(g);

        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (!teamSnap.exists()) {
          navigate(`/teams/${teamId}/manage`, { replace: true });
          return;
        }
        const teamData = teamSnap.data() as { ownerUid?: string };

        const allSnap = await getDocs(collection(db, "teams", teamId, "members"));
        let myRole: string | undefined;
        allSnap.forEach((d) => {
          const raw = d.data() as { userId?: string; status?: string; role?: string };
          if (raw.status === "active" && raw.userId?.trim() === user.uid.trim()) myRole = raw.role;
        });
        if (!myRole && teamData.ownerUid !== user.uid) {
          toast.error("팀 멤버만 접근할 수 있어요.");
          navigate(`/teams/${teamId}/games`, { replace: true });
          return;
        }
        const isOwner = teamData.ownerUid === user.uid;
        const isAdmin = myRole === "admin" || myRole === "owner";
        if (!isOwner && !isAdmin) {
          toast.error("팀장·관리자만 출전을 편집할 수 있어요.");
          navigate(`/teams/${teamId}/games`, { replace: true });
          return;
        }
        setHasPermission(true);

        const list: Row[] = [];
        allSnap.forEach((d) => {
          const raw = d.data() as {
            status?: string;
            isDeleted?: boolean;
            displayName?: string;
            name?: string;
            userId?: string;
          };
          if (raw.status !== "active" || raw.isDeleted === true) return;
          if (!raw.userId?.trim()) return;
          const label =
            (typeof raw.displayName === "string" && raw.displayName.trim()) ||
            (typeof raw.name === "string" && raw.name.trim()) ||
            "팀원";
          list.push({ memberId: d.id, label });
        });
        list.sort((a, b) => a.label.localeCompare(b.label, "ko"));
        setRows(list);

        const existing = g.playParticipation?.byTeam?.[teamId]?.entries ?? [];
        const nextFlags: Record<string, boolean[]> = {};
        for (const r of list) {
          const hit = existing.find((e) => e.memberId === r.memberId);
          nextFlags[r.memberId] = hit ? flagsFromEntry(hit) : [false, false, false, false];
        }
        setFlagsByMember(nextFlags);

        setQuarterPlan(normalizeQuarterMinutePlan(g.playParticipation?.quarterMinutePlan));
      } catch (e) {
        console.error(e);
        toast.error("불러오기에 실패했어요.");
        navigate(`/teams/${teamId}/games`, { replace: true });
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [gameId, navigate, teamId, user]);

  const toggleQuarter = useCallback((memberId: string, qi: number) => {
    setFlagsByMember((prev) => {
      const cur = [...(prev[memberId] ?? [false, false, false, false])];
      cur[qi] = !cur[qi];
      return { ...prev, [memberId]: cur };
    });
  }, []);

  const onSave = async () => {
    if (!teamId || !gameId || !canEdit) return;
    const entries: TeamGamePlayParticipationEntry[] = [];
    for (const r of rows) {
      const f = flagsByMember[r.memberId] ?? [false, false, false, false];
      const count = f.filter(Boolean).length;
      if (count === 0) continue;
      entries.push({
        memberId: r.memberId,
        quartersPlayed: count,
      });
    }
    if (entries.length === 0) {
      toast.message("한 명 이상 출전 쿼터를 선택해 주세요.");
      return;
    }
    try {
      setSaving(true);
      await updateTeamGamePlayParticipation(gameId, teamId, {
        entries,
        quarterMinutePlan: quarterPlan,
      });
      toast.success("출전 정보를 저장했어요.");
      navigate(`/teams/${teamId}/games`, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" aria-hidden />
      </div>
    );
  }

  if (!game) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-8">
      <div className="w-full">
        <Link
          to={`/teams/${teamId}/games`}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          경기 목록
        </Link>

        <h1 className="text-2xl font-black text-gray-900">출전 쿼터 입력</h1>
        <p className="mt-2 text-sm text-gray-600">
          완료된 경기 기준으로 누가 몇 쿼터에 나왔는지만 기록하면, 플레이 시뮬에 실제 가중으로 반영돼요.
        </p>

        {game.status !== "completed" ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            경기가 아직 완료되지 않았어요. 결과 입력 후 다시 열어 주세요.
          </p>
        ) : (
          <>
            <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">쿼터 길이(분)</h2>
              <p className="mt-1 text-xs text-gray-500">풋살 기본 15×4 — 팀에 맞게 조정해 주세요.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Q_LABELS.map((lab, i) => (
                  <label key={lab} className="text-xs font-semibold text-gray-600">
                    {lab}
                    <input
                      type="number"
                      min={5}
                      max={45}
                      value={quarterPlan[i] ?? 15}
                      onChange={(e) => {
                        const v = Math.max(5, Math.min(45, Math.round(Number(e.target.value) || 15)));
                        setQuarterPlan((prev) => {
                          const n = [...prev];
                          n[i] = v;
                          return n;
                        });
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">멤버별 출전</h2>
              {rows.length === 0 ? (
                <p className="text-sm text-gray-500">연동된 활성 멤버가 없어요.</p>
              ) : (
                <ul className="space-y-3">
                  {rows.map((r) => (
                    <li
                      key={r.memberId}
                      className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm font-bold text-gray-900">{r.label}</span>
                      <div className="flex flex-wrap gap-3">
                        {Q_LABELS.map((lab, qi) => {
                          const on = !!(flagsByMember[r.memberId] ?? [])[qi];
                          return (
                            <label key={lab} className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                                checked={on}
                                disabled={!canEdit}
                                onChange={() => toggleQuarter(r.memberId, qi)}
                              />
                              {lab}
                            </label>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" disabled={!canEdit || saving} onClick={() => void onSave()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/teams/${teamId}/games`)}>
                취소
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
