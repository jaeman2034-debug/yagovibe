/**
 * 내 팀 목록 — `/my-teams`
 * team_members 기준(useMyTeams) 소속 팀 → 클릭 시 `/team/:teamId`
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useChatRoomsUnread } from "@/hooks/useChatRoomsUnread";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight } from "lucide-react";

type Row = { id: string; name: string };

export default function MyTeamsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUnreadForTeamId } = useChatRoomsUnread();
  const { teamIds, loading: teamsLoading } = useMyTeams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingNames, setLoadingNames] = useState(true);

  useEffect(() => {
    if (!teamIds.length) {
      setRows([]);
      setLoadingNames(false);
      return;
    }

    let cancelled = false;
    setLoadingNames(true);
    void Promise.all(
      teamIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, "teams", id));
          if (!snap.exists()) return { id, name: `팀 ${id.slice(0, 6)}…` };
          const d = snap.data() as { name?: string };
          return { id, name: String(d.name || "이름 없는 팀") };
        } catch {
          return { id, name: `팀 ${id.slice(0, 6)}…` };
        }
      })
    ).then((list) => {
      if (!cancelled) {
        setRows(list);
        setLoadingNames(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [teamIds]);

  if (!user) {
    return null;
  }

  /** 멤버십(useMyTeams)만 전체 스피너. 팀 이름 getDoc은 무한 로딩 원인이 되지 않게 분리 */
  const membershipLoading = teamsLoading;
  const displayRows: Row[] =
    teamIds.length > 0
      ? teamIds.map((id) => {
          const hit = rows.find((r) => r.id === id);
          return hit ?? { id, name: `팀 ${id.slice(0, 6)}…` };
        })
      : [];

  return (
    <div className="w-full max-w-none px-3 md:mx-auto md:max-w-lg py-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">내 팀</h1>
      {membershipLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : teamIds.length === 0 ? (
        <p className="text-sm text-gray-600">소속된 팀이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {displayRows.map((t) => {
            const teamUnread = getUnreadForTeamId(t.id);
            const namePending = loadingNames && !rows.find((r) => r.id === t.id);
            return (
            <li key={t.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-gray-50"
                onClick={() => navigate(`/team/${t.id}`)}
              >
                <span className="flex min-w-0 items-center gap-2 font-medium text-gray-900">
                  <span className="truncate">{t.name}</span>
                  {namePending && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" aria-hidden />
                  )}
                  {teamUnread > 0 && (
                    <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {teamUnread > 99 ? "99+" : teamUnread}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            </li>
            );
          })}
        </ul>
      )}
      <Button className="mt-6 w-full" variant="outline" onClick={() => navigate("/sports/soccer/team/create")}>
        팀 만들기
      </Button>
    </div>
  );
}
