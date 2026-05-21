import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { createTeamLineup, type TeamLineupPlayer } from "@/services/teamLineupService";

type TeamMemberRow = {
  memberId: string;
  name: string;
  role: string;
  position?: string;
  jerseyNumber?: number;
  birthYear?: number;
};

const FORMATION_OPTIONS = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"] as const;
const POSITION_OPTIONS = ["GK", "DF", "MF", "FW"] as const;
const POSITION_ORDER: Record<string, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };
const FORMATION_SLOT_MAP: Record<(typeof FORMATION_OPTIONS)[number], Record<"GK" | "DF" | "MF" | "FW", number>> = {
  "4-4-2": { GK: 1, DF: 4, MF: 4, FW: 2 },
  "4-3-3": { GK: 1, DF: 4, MF: 3, FW: 3 },
  "3-5-2": { GK: 1, DF: 3, MF: 5, FW: 2 },
  "4-2-3-1": { GK: 1, DF: 4, MF: 5, FW: 1 },
};

const LAST_LINEUP_CONTEXT_KEY = "yago:lastLineupContext";

function defaultPosition(p?: string): string {
  const next = String(p || "").trim().toUpperCase();
  return POSITION_OPTIONS.includes(next as (typeof POSITION_OPTIONS)[number]) ? next : "MF";
}

function sortByPosition(players: TeamLineupPlayer[]): TeamLineupPlayer[] {
  return [...players].sort((a, b) => {
    const pa = POSITION_ORDER[a.position] ?? 99;
    const pb = POSITION_ORDER[b.position] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, "ko");
  });
}

export default function TeamLineupPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [opponentName, setOpponentName] = useState("");
  const [lineupDate, setLineupDate] = useState("");
  const [formation, setFormation] = useState<(typeof FORMATION_OPTIONS)[number]>("4-4-2");
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [starters, setStarters] = useState<TeamLineupPlayer[]>([]);
  const [subs, setSubs] = useState<TeamLineupPlayer[]>([]);
  const [recommendStrategy, setRecommendStrategy] = useState<"balanced" | "young" | "senior">("balanced");
  const [availableMap, setAvailableMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "teams", teamId));
        if (!alive || !snap.exists()) return;
        const settings = (snap.data() as Record<string, unknown>)?.settings as Record<string, unknown> | undefined;
        if (!settings || typeof settings !== "object" || Array.isArray(settings)) return;

        const f = settings.defaultFormation;
        if (typeof f === "string" && (FORMATION_OPTIONS as readonly string[]).includes(f)) {
          setFormation(f as (typeof FORMATION_OPTIONS)[number]);
        }

        const s = settings.defaultStrategy;
        if (s === "balanced" || s === "young" || s === "senior") {
          setRecommendStrategy(s);
        }
      } catch {
        // 팀 설정은 best-effort — 실패해도 라인업 작성은 계속 가능
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    const unsub = onSnapshot(
      collection(db, "teams", teamId, "members"),
      (snap) => {
        const next = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            const role = String(data.role || "member");
            if (String(data.status || "active") !== "active") return null;
            return {
              memberId: d.id,
              name: String(data.displayName || data.name || data.userName || "이름없음"),
              role,
              position: typeof data.position === "string" ? data.position : undefined,
              jerseyNumber: typeof data.jerseyNumber === "number" ? data.jerseyNumber : undefined,
              birthYear: typeof data.birthYear === "number" ? data.birthYear : undefined,
            } as TeamMemberRow;
          })
          .filter((v): v is TeamMemberRow => v !== null);
        setMembers(next);
      },
      () => {
        toast.error("팀 멤버를 불러오지 못했습니다.");
      }
    );
    return () => unsub();
  }, [teamId]);

  const toLineupPlayer = (member: TeamMemberRow): TeamLineupPlayer => ({
    memberId: member.memberId,
    name: member.name,
    position: defaultPosition(member.position),
    jerseyNumber: member.jerseyNumber,
  });

  const moveMember = (member: TeamMemberRow) => {
    const isStarter = starters.some((m) => m.memberId === member.memberId);
    const isSub = subs.some((m) => m.memberId === member.memberId);

    // 선발 -> 교체
    if (isStarter) {
      const player = starters.find((m) => m.memberId === member.memberId);
      if (!player) return;
      setStarters((prev) => prev.filter((m) => m.memberId !== member.memberId));
      setSubs((prev) => [...prev, player]);
      return;
    }

    // 교체 -> 선발
    if (isSub) {
      if (starters.length >= 11) {
        toast.error("선발은 최대 11명까지 선택할 수 있습니다.");
        return;
      }
      const player = subs.find((m) => m.memberId === member.memberId);
      if (!player) return;
      setSubs((prev) => prev.filter((m) => m.memberId !== member.memberId));
      setStarters((prev) => sortByPosition([...prev, player]));
      return;
    }

    // 최초 선택: 선발 우선, 선발 가득 차면 교체
    if (starters.length < 11) {
      setStarters((prev) => sortByPosition([...prev, toLineupPlayer(member)]));
    } else {
      setSubs((prev) => [...prev, toLineupPlayer(member)]);
    }
  };

  const removeStarter = (memberId: string) => {
    setStarters((prev) => prev.filter((m) => m.memberId !== memberId));
  };

  const removeSub = (memberId: string) => {
    setSubs((prev) => prev.filter((m) => m.memberId !== memberId));
  };

  const updateStarterPosition = (memberId: string, position: string) => {
    setStarters((prev) =>
      sortByPosition(
        prev.map((m) => (m.memberId === memberId ? { ...m, position: defaultPosition(position) } : m))
      )
    );
  };

  const updateSubPosition = (memberId: string, position: string) => {
    setSubs((prev) =>
      prev.map((m) => (m.memberId === memberId ? { ...m, position: defaultPosition(position) } : m))
    );
  };

  const saveLineup = async () => {
    if (!teamId) return;
    const opponent = opponentName.trim();
    if (!opponent) {
      toast.error("상대팀 이름을 입력해 주세요.");
      return;
    }
    if (!lineupDate) {
      toast.error("경기 날짜를 선택해 주세요.");
      return;
    }
    if (starters.length !== 11) {
      toast.error("선발 11명을 정확히 선택해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const displayOpponent = opponent.replace(/^vs\s+/i, "").trim() || opponent;
      const resolvedLineupName = `vs ${displayOpponent}`;

      const normalizedStarters = starters.map((p) => ({
        memberId: String((p as { memberId?: string; id?: string }).memberId ?? (p as { id?: string }).id ?? "").trim(),
        name: String(p.name || "").trim(),
        position: defaultPosition(p.position),
        jerseyNumber: typeof p.jerseyNumber === "number" ? p.jerseyNumber : undefined,
      }));
      const normalizedSubs = subs.map((p) => ({
        memberId: String((p as { memberId?: string; id?: string }).memberId ?? (p as { id?: string }).id ?? "").trim(),
        name: String(p.name || "").trim(),
        position: defaultPosition(p.position),
        jerseyNumber: typeof p.jerseyNumber === "number" ? p.jerseyNumber : undefined,
      }));

      const payload = {
        name: resolvedLineupName,
        opponentName: displayOpponent,
        date: lineupDate,
        formation,
        strategy: recommendStrategy,
        starters: normalizedStarters,
        subs: normalizedSubs,
        availableMap,
      };
      console.log("[TeamLineupPage] save payload", payload);

      const lineupId = await createTeamLineup(teamId, {
        ...payload,
      });
      let teamName = "";
      try {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (teamSnap.exists()) {
          const td = teamSnap.data() as Record<string, unknown>;
          teamName = String(td.name ?? td.displayName ?? td.teamName ?? "").trim();
        }
      } catch {
        // 팀명 조회 실패는 저장 성공에 영향 없음
      }
      try {
        localStorage.setItem(
          LAST_LINEUP_CONTEXT_KEY,
          JSON.stringify({
            teamId,
            lineupId,
            lineupName: resolvedLineupName,
            teamName,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {
        // localStorage 불가 환경은 무시
      }
      toast.success("라인업 저장 완료");
      navigate(`/team/${encodeURIComponent(teamId)}/lineup/list`);
    } catch (error) {
      console.error("[TeamLineupPage] 라인업 저장 실패:", error);
      toast.error("라인업 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const autoGenerateLineup = () => {
    const slots = FORMATION_SLOT_MAP[formation] ?? FORMATION_SLOT_MAP["4-4-2"];
    const sortByStrategy = (rows: TeamMemberRow[]): TeamMemberRow[] => {
      if (recommendStrategy === "young") {
        return [...rows].sort((a, b) => (b.birthYear ?? 0) - (a.birthYear ?? 0));
      }
      if (recommendStrategy === "senior") {
        return [...rows].sort((a, b) => (a.birthYear ?? 0) - (b.birthYear ?? 0));
      }
      return rows;
    };

    const availableMembers = members.filter((m) => availableMap[m.memberId] !== false);
    if (availableMembers.length < 11) {
      toast.error("출전 가능 인원이 부족합니다.");
      return;
    }

    const sortedMembers = sortByStrategy(availableMembers);
    const byPosition = {
      GK: sortedMembers.filter((m) => defaultPosition(m.position) === "GK"),
      DF: sortedMembers.filter((m) => defaultPosition(m.position) === "DF"),
      MF: sortedMembers.filter((m) => defaultPosition(m.position) === "MF"),
      FW: sortedMembers.filter((m) => defaultPosition(m.position) === "FW"),
    };

    const pickedIds = new Set<string>();
    const startersPicked: TeamLineupPlayer[] = [];
    const takeByPosition = (arr: TeamMemberRow[], count: number) => {
      let taken = 0;
      for (const m of arr) {
        if (taken >= count || startersPicked.length >= 11) break;
        if (pickedIds.has(m.memberId)) continue;
        startersPicked.push(toLineupPlayer(m));
        pickedIds.add(m.memberId);
        taken++;
      }
    };

    takeByPosition(byPosition.GK, slots.GK);
    takeByPosition(byPosition.DF, slots.DF);
    takeByPosition(byPosition.MF, slots.MF);
    takeByPosition(byPosition.FW, slots.FW);

    if (startersPicked.length < 11) {
      const remaining = sortedMembers.filter((m) => !pickedIds.has(m.memberId));
      for (const m of remaining) {
        if (startersPicked.length >= 11) break;
        startersPicked.push(toLineupPlayer(m));
        pickedIds.add(m.memberId);
      }
    }

    const subsPicked = sortedMembers
      .filter((m) => !pickedIds.has(m.memberId))
      .map((m) => toLineupPlayer(m));

    setStarters(sortByPosition(startersPicked.slice(0, 11)));
    setSubs(subsPicked);
    toast.success("라인업 자동 추천 완료");
  };

  if (!teamId) return null;

  return (
    <div className="w-full max-w-none md:mx-auto md:max-w-5xl space-y-4 py-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">출전 라인업</h1>
            <p className="mt-1 text-sm text-gray-500">선발 11명과 교체 명단을 저장합니다.</p>
          </div>
          <Button type="button" onClick={() => void saveLineup()} disabled={saving}>
            {saving ? "저장 중..." : "라인업 저장"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={recommendStrategy}
            onChange={(e) => setRecommendStrategy(e.target.value as "balanced" | "young" | "senior")}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="balanced">균형</option>
            <option value="young">젊은 선수 우선</option>
            <option value="senior">고연령 우선</option>
          </select>
          <Button type="button" onClick={autoGenerateLineup} className="bg-purple-600 hover:bg-purple-700">
            자동 추천
          </Button>
          <span className="text-xs text-gray-500">
            추천 기준:{" "}
            {recommendStrategy === "balanced"
              ? "균형"
              : recommendStrategy === "young"
                ? "젊은 선수 우선"
                : "고연령 우선"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-gray-300 bg-white px-3 py-2">
            <label className="block text-xs font-medium text-gray-600">상대팀 이름</label>
            <input
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="예: 강남FC (자동으로 vs 강남FC로 저장)"
              className="mt-1 w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
            />
          </div>
          <input
            type="date"
            value={lineupDate}
            onChange={(e) => setLineupDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={formation}
            onChange={(e) => setFormation(e.target.value as (typeof FORMATION_OPTIONS)[number])}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {FORMATION_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-900">팀 멤버</h2>
          <p className="mt-1 text-xs text-gray-500">카드를 클릭하면 선발↔교체로 원클릭 이동합니다.</p>
          <div className="mt-3 max-h-[60vh] space-y-2 overflow-auto">
            {members.map((m) => {
              const isStarter = starters.some((p) => p.memberId === m.memberId);
              const isSub = subs.some((p) => p.memberId === m.memberId);
              return (
                <button
                  key={m.memberId}
                  type="button"
                  onClick={() => moveMember(m)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-left hover:border-gray-300 hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {m.name}
                    {typeof m.jerseyNumber === "number" ? ` (#${m.jerseyNumber})` : ""}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">역할: {m.role}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <label
                      className="flex items-center text-xs text-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={availableMap[m.memberId] ?? true}
                        onChange={(e) =>
                          setAvailableMap((prev) => ({
                            ...prev,
                            [m.memberId]: e.target.checked,
                          }))
                        }
                      />
                      <span className="ml-1">출전 가능</span>
                    </label>
                    {availableMap[m.memberId] === false ? (
                      <span className="text-xs font-medium text-red-500">불참</span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {isStarter ? "다시 클릭 시 교체로 이동" : isSub ? "다시 클릭 시 선발로 이동" : "클릭 시 선택"}
                    </span>
                    <div className="flex gap-1">
                      {isStarter ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          선발
                        </span>
                      ) : null}
                      {isSub ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          교체
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-900">선발 ({starters.length}/11)</h2>
          <div className="mt-3 space-y-2">
            {starters.map((m) => (
              <div key={m.memberId} className="rounded-lg border border-gray-200 p-2">
                <p className="text-sm font-medium text-gray-900">
                  {m.name}
                  {typeof m.jerseyNumber === "number" ? ` (#${m.jerseyNumber})` : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={m.position}
                    onChange={(e) => updateStarterPosition(m.memberId, e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                  >
                    {POSITION_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" onClick={() => removeStarter(m.memberId)}>
                    제거
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-900">교체 ({subs.length})</h2>
          <div className="mt-3 space-y-2">
            {subs.map((m) => (
              <div key={m.memberId} className="rounded-lg border border-gray-200 p-2">
                <p className="text-sm font-medium text-gray-900">
                  {m.name}
                  {typeof m.jerseyNumber === "number" ? ` (#${m.jerseyNumber})` : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={m.position}
                    onChange={(e) => updateSubPosition(m.memberId, e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                  >
                    {POSITION_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" onClick={() => removeSub(m.memberId)}>
                    제거
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link to={`/team/${encodeURIComponent(teamId)}`}>취소</Link>
        </Button>
        <Button type="button" onClick={() => void saveLineup()} disabled={saving}>
          {saving ? "저장 중..." : "라인업 저장"}
        </Button>
      </div>
    </div>
  );
}

