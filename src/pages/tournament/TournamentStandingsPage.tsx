/**
 * 🔥 대회 랭킹/순위표 페이지
 * 
 * 경로: /tournament/:tournamentId/standings
 * 
 * 역할:
 * - 대회별 팀 순위표 표시
 * - 경기 결과 기반 자동 계산
 * - 정렬: 승점 → 득실차 → 다득점
 */

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getTournamentStandings, type TeamStats } from "@/lib/tournament/teamStats";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDoc as getDocTyped } from "firebase/firestore";

export default function TournamentStandingsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [standings, setStandings] = useState<TeamStats[]>([]);

  // 대회 정보 조회
  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const loadTournament = async () => {
      try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        const tournamentSnap = await getDocTyped(tournamentRef);
        if (tournamentSnap.exists()) {
          setTournament(tournamentSnap.data());
        }
      } catch (e) {
        console.error("대회 정보 조회 실패:", e);
      }
    };

    loadTournament();
  }, [tournamentId]);

  // 순위표 조회
  useEffect(() => {
    if (!tournamentId) return;

    const loadStandings = async () => {
      try {
        const standingsList = await getTournamentStandings(tournamentId);
        setStandings(standingsList);
      } catch (e) {
        console.error("순위표 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    loadStandings();
  }, [tournamentId]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">
          순위표
          {tournament && ` - ${tournament.name}`}
        </h1>

        {standings.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">아직 경기 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      순위
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      팀
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      경기
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      승
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      무
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      패
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      득점
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      실점
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      득실차
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      승점
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {standings.map((team, index) => (
                    <tr
                      key={team.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        index < 3 ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {team.teamId}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {team.played}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">
                        {team.wins}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {team.draws}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">
                        {team.losses}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {team.goalsFor}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {team.goalsAgainst}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-center font-medium ${
                          team.goalDiff > 0
                            ? "text-green-600"
                            : team.goalDiff < 0
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {team.goalDiff > 0 ? "+" : ""}
                        {team.goalDiff}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-blue-600">
                        {team.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
