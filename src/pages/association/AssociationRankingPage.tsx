import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TeamRow {
  id: string;
  name?: string;
  associationId?: string;
  stats?: {
    games?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    points?: number;
    goalDiff?: number;
  };
  recentForm?: Array<"W" | "D" | "L">;
}

export default function AssociationRankingPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!associationId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = query(collection(db, "teams"), where("associationId", "==", associationId));
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamRow, "id">) }));
        setTeams(rows);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [associationId]);

  const sorted = useMemo(() => {
    return [...teams].sort((a, b) => {
      const pa = Number(a.stats?.points || 0);
      const pb = Number(b.stats?.points || 0);
      if (pb !== pa) return pb - pa;
      const gda = Number(a.stats?.goalDiff || 0);
      const gdb = Number(b.stats?.goalDiff || 0);
      return gdb - gda;
    });
  }, [teams]);

  const rankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}위`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <button type="button" className="text-sm text-gray-500" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </button>
        <h1 className="text-2xl font-bold">협회 랭킹</h1>

        <div className="rounded-xl border bg-white p-4">
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-gray-500">랭킹 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((team, idx) => {
                const stats = team.stats || {};
                const rank = idx + 1;
                return (
                  <div key={team.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {rankBadge(rank)} {team.name || "팀"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {Number(stats.wins || 0)}승 {Number(stats.draws || 0)}무 {Number(stats.losses || 0)}패
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        최근 5경기: {(team.recentForm || []).join(" ") || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{Number(stats.points || 0)}점</p>
                      <p className="text-xs text-gray-500">경기 {Number(stats.games || 0)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

