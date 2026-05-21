/**
 * 🔥 사용자용 읽기 전용 대진표 페이지
 * /association/:associationId/tournaments/:tournamentId/bracket
 * 
 * 기능:
 * - 관리자 ❌ / 사용자 전용 ⭕
 * - 읽기 전용 (Firestore rounds + matches 기반)
 * - Hook 순서 안 깨짐
 * - permission 오류 최소화 (읽기만)
 */

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useParams } from "react-router-dom";
import BracketColumn from "@/components/bracket/BracketColumn";

export default function TournamentBracketPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();

  // 🔥 모든 Hook은 컴포넌트 최상단에서 호출 (조건부 사용 절대 금지)
  const [rounds, setRounds] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!associationId || !tournamentId) {
      setError("필수 파라미터가 없습니다.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 Rounds 조회 (roundNumber 기준 정렬)
        const roundsRef = query(
          collection(
            db,
            "associations",
            associationId,
            "tournaments",
            tournamentId,
            "rounds"
          ),
          orderBy("roundNumber", "asc")
        );

        // 🔥 Matches 조회 (roundNumber 기준 정렬)
        const matchesRef = query(
          collection(
            db,
            "associations",
            associationId,
            "tournaments",
            tournamentId,
            "matches"
          ),
          orderBy("roundNumber", "asc")
        );

        const [roundSnap, matchSnap] = await Promise.all([
          getDocs(roundsRef),
          getDocs(matchesRef),
        ]);

        setRounds(roundSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setMatches(matchSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e: any) {
        console.error("대진표 조회 오류", e);
        setError(e.message || "데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [associationId, tournamentId]);

  // 🔥 조건부 return은 Hook 호출 이후 (Hook 순서 보장)
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대진표 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-2">아직 생성된 대진표가 없습니다.</p>
          <p className="text-sm text-gray-400">대진표 확정 후 공개됩니다.</p>
        </div>
      </div>
    );
  }

  // 🔥 라운드별로 정렬 (결승 먼저 표시하기 위해 역순)
  const sortedRounds = [...rounds]
    .filter((r) => r.roundNumber != null)
    .sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {sortedRounds.map((round) => {
            // 🔥 roundNumber로 매칭 (roundId가 아닌 roundNumber 사용)
            const roundMatches = matches.filter(
              (m) => m.roundNumber === round.roundNumber
            );

            return (
              <BracketColumn
                key={round.id}
                round={round}
                matches={roundMatches}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

