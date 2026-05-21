/**
 * 🔥 사용자용 읽기 전용 대진표 페이지
 * /association/:associationId/tournaments/:tournamentId/bracket
 * 
 * 기능:
 * - rounds, matches 직접 읽기
 * - 라운드별 컬럼 구조
 * - 모바일 최적화
 */

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchCard } from "@/components/tournament/MatchCard";

export default function TournamentBracketPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();

  // 🔥 모든 Hook은 컴포넌트 최상단에서 호출
  const [tournament, setTournament] = useState<any>(null);
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

        // 🔥 Tournament 정보 조회
        const tournamentRef = doc(
          db,
          `associations/${associationId}/tournaments/${tournamentId}`
        );
        const tournamentSnap = await getDoc(tournamentRef);

        if (!tournamentSnap.exists()) {
          throw new Error("대회를 찾을 수 없습니다.");
        }

        setTournament({ id: tournamentSnap.id, ...tournamentSnap.data() });

        // 🔥 Rounds 조회 (roundNumber 기준 정렬)
        const roundsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/rounds`
        );
        const roundsQuery = query(roundsRef, orderBy("roundNumber", "asc"));
        const roundsSnap = await getDocs(roundsQuery);
        const roundsData = roundsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setRounds(roundsData);

        // 🔥 Matches 조회 (roundNumber 기준 정렬)
        const matchesRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/matches`
        );
        const matchesQuery = query(matchesRef, orderBy("roundNumber", "asc"));
        const matchesSnap = await getDocs(matchesQuery);
        const matchesData = matchesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMatches(matchesData);
      } catch (err: any) {
        console.error("데이터 로드 오류:", err);
        setError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [associationId, tournamentId]);

  // 🔥 조건부 return은 Hook 호출 이후
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

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "대회를 찾을 수 없습니다."}</p>
        </div>
      </div>
    );
  }

  // 🔥 라운드별 정렬 (결승 먼저 표시)
  const sortedRounds = rounds
    .filter((r) => r.roundNumber != null)
    .sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0));

  // 🔥 우승팀 정보
  const isCompleted = tournament.status === "completed";
  const winnerTeamName = tournament.winnerTeamName;

  return (
    <main className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 🔥 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {tournament.name}
          </h1>
          <p className="text-gray-600 text-sm md:text-base">대진표</p>
        </div>

        {/* 🔥 우승팀 배너 (완료 시) */}
        {isCompleted && winnerTeamName && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 p-4 rounded-lg mb-6 text-center">
            <div className="text-yellow-800 font-semibold text-lg">
              🏆 우승팀: <strong className="text-yellow-900">{winnerTeamName}</strong>
            </div>
          </div>
        )}

        {/* 🔥 라운드별 컬럼 (모바일: 세로 스크롤) */}
        <div className="space-y-6 md:space-y-8">
          {sortedRounds.map((round) => {
            const roundMatches = matches.filter(
              (m) => m.roundNumber === round.roundNumber
            );
            const isFinalRound = sortedRounds.length > 0 && 
              round.roundNumber === sortedRounds[sortedRounds.length - 1].roundNumber;

            return (
              <section
                key={round.id}
                className={`bg-white rounded-lg shadow-md p-4 md:p-6 ${
                  isFinalRound ? "border-2 border-yellow-400 bg-yellow-50" : ""
                }`}
              >
                {/* 🔥 라운드 헤더 */}
                <div className="mb-4 pb-3 border-b-2 border-gray-200">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                    {isFinalRound && <span className="text-yellow-600">🏆</span>}
                    {round.title || round.name || `Round ${round.roundNumber}`}
                    {isFinalRound && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        결승
                      </span>
                    )}
                  </h2>
                </div>

                {/* 🔥 경기 카드 목록 */}
                {roundMatches.length > 0 ? (
                  <div className="space-y-3">
                    {roundMatches.map((match) => (
                      <MatchCard key={match.id} match={match} readonly />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    자동 진출
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* 🔥 빈 대진표 메시지 */}
        {sortedRounds.length === 0 && matches.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 mb-2">대진표가 아직 생성되지 않았습니다.</p>
            <p className="text-sm text-gray-400">대진표 확정 후 공개됩니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
