import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import {
  duplicateTeamLineup,
  getTeamLineups,
  type TeamLineupDoc,
} from "@/services/teamLineupService";

const LAST_LINEUP_CONTEXT_KEY = "yago:lastLineupContext";

type LastLineupContext = {
  teamId: string;
  lineupId: string;
  lineupName?: string;
  teamName?: string;
  savedAt?: string;
};

function formatLineupListTitle(teamName: string, lineup: TeamLineupDoc): string {
  const team = teamName.trim();
  const opp = (lineup.opponentName || "").trim();
  if (team && opp) return `${team} vs ${opp}`;
  const n = (lineup.name || "").trim();
  if (team && n) return `${team} ${n}`;
  return n || "이름 없는 라인업";
}

export default function TeamLineupListPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lineups, setLineups] = useState<TeamLineupDoc[]>([]);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [teamDisplayName, setTeamDisplayName] = useState<string>("");
  const [otherTeamLineupHint, setOtherTeamLineupHint] = useState<LastLineupContext | null>(null);

  const loadLineups = async (silent = false) => {
    if (!teamId) return;
    try {
      if (!silent) setLoading(true);
      const rows = await getTeamLineups(teamId);
      setLineups(rows);

      try {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (teamSnap.exists()) {
          const td = teamSnap.data() as Record<string, unknown>;
          setTeamDisplayName(String(td.name ?? td.displayName ?? td.teamName ?? "").trim());
        } else {
          setTeamDisplayName("");
        }
      } catch {
        setTeamDisplayName("");
      }

      try {
        const raw = localStorage.getItem(LAST_LINEUP_CONTEXT_KEY);
        if (!raw) {
          setOtherTeamLineupHint(null);
        } else {
          const parsed = JSON.parse(raw) as Partial<LastLineupContext>;
          const otherTeamId = typeof parsed.teamId === "string" ? parsed.teamId.trim() : "";
          const otherLineupId = typeof parsed.lineupId === "string" ? parsed.lineupId.trim() : "";
          if (
            otherTeamId &&
            otherLineupId &&
            otherTeamId !== teamId &&
            rows.length === 0
          ) {
            setOtherTeamLineupHint({
              teamId: otherTeamId,
              lineupId: otherLineupId,
              lineupName: typeof parsed.lineupName === "string" ? parsed.lineupName : undefined,
              teamName: typeof parsed.teamName === "string" ? parsed.teamName : undefined,
              savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined,
            });
          } else {
            setOtherTeamLineupHint(null);
          }
        }
      } catch {
        setOtherTeamLineupHint(null);
      }
    } catch (error) {
      console.error("[TeamLineupListPage] 라인업 조회 실패:", error);
      toast.error("라인업 목록을 불러오지 못했습니다.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadLineups();
  }, [teamId]);

  if (!teamId) return null;

  return (
    <div className="w-full space-y-4 py-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold text-gray-900">
          {teamDisplayName ? `${teamDisplayName} 라인업` : "라인업 목록"}
        </h1>
        <p className="mt-1 text-xs text-gray-500">팀 ID: {teamId}</p>
        <p className="mt-1 text-sm text-gray-500">저장한 선발/교체 라인업을 확인할 수 있습니다.</p>
        <div className="mt-3">
          <Button asChild>
            <Link to={`/team/${encodeURIComponent(teamId)}/lineup`}>새 라인업 만들기</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
        {!loading && lineups.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
            <p>이 팀에는 아직 저장된 라인업이 없습니다.</p>
            <p className="mt-2 text-xs text-gray-500">
              다른 팀에서 라인업을 만들었다면, 팀이 달라 목록이 비어 보일 수 있습니다.
            </p>
            {otherTeamLineupHint ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-medium">
                  최근 저장:{" "}
                  {otherTeamLineupHint.teamName?.trim()
                    ? `${otherTeamLineupHint.teamName.trim()} 팀`
                    : `팀 ${otherTeamLineupHint.teamId.slice(0, 6)}…`}
                  {otherTeamLineupHint.lineupName?.trim() ? ` · ${otherTeamLineupHint.lineupName.trim()}` : ""}
                </p>
                <div className="mt-2">
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link to={`/team/${encodeURIComponent(otherTeamLineupHint.teamId)}/lineup/list`}>
                      최근 저장 팀 목록으로 이동
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {lineups.map((lineup) => (
          <div key={lineup.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300">
            <Link to={`/team/${encodeURIComponent(teamId)}/lineup/${encodeURIComponent(lineup.id)}`} className="block">
              <p className="font-semibold text-gray-900">
                {formatLineupListTitle(teamDisplayName || "", lineup)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {lineup.date || "-"} · {lineup.formation || "-"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                선발 {lineup.starters.length}명 · 교체 {lineup.subs.length}명
              </p>
            </Link>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={duplicatingId === lineup.id}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (duplicatingId) return;
                  setDuplicatingId(lineup.id);
                  try {
                    await duplicateTeamLineup(teamId, lineup.id);
                    toast.success("라인업이 복제되었습니다.");
                    await loadLineups(true);
                  } catch (error) {
                    console.error("[TeamLineupListPage] 라인업 복제 실패:", error);
                    toast.error("라인업 복제에 실패했습니다.");
                  } finally {
                    setDuplicatingId(null);
                  }
                }}
              >
                {duplicatingId === lineup.id ? "복제 중..." : "복제"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

