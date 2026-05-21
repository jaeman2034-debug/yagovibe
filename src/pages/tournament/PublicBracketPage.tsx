/**
 * 🔥 사용자용 읽기 전용 대진표 페이지
 * /public/tournaments/:tournamentId/bracket
 * 
 * 기능:
 * - 로그인 불필요 (공개 접근)
 * - 완전 Read-only (수정/입력 불가)
 * - 관람/공유 가능
 * - 관리자 데이터 그대로 반영
 */

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { MatchCard } from "@/components/tournament/MatchCard";
import { loadPublicBracket } from "@/lib/tournament/loadPublicBracket";

export default function PublicBracketPage() {
  const { tournamentId, associationId } = useParams<{
    tournamentId: string;
    associationId?: string;
  }>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setError("대회 ID가 필요합니다.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let foundAssociationId = associationId;
        
        // associationId가 없으면 모든 associations에서 검색
        if (!foundAssociationId) {
          const { collection, getDocs, doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          const associationsRef = collection(db, "associations");
          const associationsSnap = await getDocs(associationsRef);
          
          for (const assocDoc of associationsSnap.docs) {
            const tRef = doc(db, "associations", assocDoc.id, "tournaments", tournamentId);
            const tournamentSnap = await getDoc(tRef);
            if (tournamentSnap.exists()) {
              foundAssociationId = assocDoc.id;
              break;
            }
          }
        }

        if (!foundAssociationId) {
          throw new Error("Tournament not found");
        }

        const result = await loadPublicBracket(foundAssociationId, tournamentId);
        setData(result);
      } catch (err: any) {
        console.error("데이터 로드 오류:", err);
        setError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId, associationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "대회를 찾을 수 없습니다."}</p>
        </div>
      </div>
    );
  }

  const { tournament, rounds, matches } = data;

  return (
    <main className="p-4 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold mb-2">{tournament.name}</h1>

        {tournament.status === "completed" && tournament.winnerTeamName && (
          <div className="bg-yellow-100 border border-yellow-400 p-3 rounded mb-4">
            🏆 우승팀: <strong>{tournament.winnerTeamName}</strong>
          </div>
        )}

        {rounds
          .filter((r: any) => r.roundNumber != null)
          .sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0))
          .map((round: any) => (
            <section key={round.id} className="mb-4 bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-2 text-lg">
                {round.title || round.name || `Round ${round.roundNumber}`}
              </h2>

              {matches
                .filter((m: any) => m.roundNumber === round.roundNumber)
                .map((m: any) => (
                  <MatchCard key={m.id} match={m} readonly />
                        ))}
                  </section>
          ))}

        {rounds.length === 0 && matches.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 mb-2">대진표가 아직 생성되지 않았습니다.</p>
            <p className="text-sm text-gray-400">대진표 확정 후 공개됩니다.</p>
            </div>
          )}
      </div>
    </main>
  );
}
