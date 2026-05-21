/**
 * 🔥 라이브 스코어 공개 페이지 (관중용)
 * 
 * 경로: /tournament/:tournamentId/match/:matchId/live
 * 
 * 역할:
 * - 실시간 스코어 표시 (공개)
 * - 경기 상태 자동 업데이트
 * - 관중/팀이 실시간으로 경기 확인
 */

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getMatchResult, type Match, type MatchResult } from "@/lib/tournament/match";

export default function MatchLivePage() {
  const { tournamentId, matchId } = useParams<{
    tournamentId: string;
    matchId: string;
  }>();

  const [match, setMatch] = useState<Match | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);

  // 실시간 구독
  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const matchRef = doc(db, "matches", matchId);
    const unsubscribe = onSnapshot(matchRef, async (snap) => {
      if (!snap.exists()) {
        setMatch(null);
        setLoading(false);
        return;
      }

      const matchData = {
        id: snap.id,
        ...snap.data(),
      } as Match;

      setMatch(matchData);

      // DONE 상태면 결과 조회
      if (matchData.status === "DONE") {
        const matchResult = await getMatchResult(matchId);
        setResult(matchResult);
      } else {
        setResult(null);
      }

      setLoading(false);
    }, (error) => {
      console.error("실시간 경기 구독 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

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

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">경기를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const isLive = match.status === "LIVE";
  const liveHomeScore = match.liveHomeScore ?? 0;
  const liveAwayScore = match.liveAwayScore ?? 0;
  const finalHomeScore = result?.homeScore ?? liveHomeScore;
  const finalAwayScore = result?.awayScore ?? liveAwayScore;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* 상태 배지 */}
          <div className="text-center mb-6">
            {isLive && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full animate-pulse">
                <span className="w-3 h-3 bg-white rounded-full"></span>
                <span className="font-bold">LIVE</span>
              </div>
            )}
            {match.status === "SCHEDULED" && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full">
                <span>예정</span>
              </div>
            )}
            {match.status === "DONE" && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full">
                <span>종료</span>
              </div>
            )}
          </div>

          {/* 팀명 및 스코어 */}
          <div className="text-center mb-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-4">
                  {match.homeTeamId}
                </div>
                <div
                  className={`text-6xl font-bold ${
                    isLive ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {finalHomeScore}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-4">
                  {match.awayTeamId}
                </div>
                <div
                  className={`text-6xl font-bold ${
                    isLive ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {finalAwayScore}
                </div>
              </div>
            </div>
          </div>

          {/* 결과 정보 */}
          {result && result.winnerTeamId && (
            <div className="text-center mt-6 p-4 bg-green-50 rounded">
              <p className="text-lg font-semibold text-green-800">
                승자:{" "}
                {result.winnerTeamId === match.homeTeamId
                  ? match.homeTeamId
                  : match.awayTeamId}
              </p>
            </div>
          )}

          {/* 마지막 업데이트 시간 */}
          {isLive && match.lastUpdatedAt && (
            <div className="text-center mt-6 text-sm text-gray-500">
              마지막 업데이트:{" "}
              {match.lastUpdatedAt.toDate
                ? match.lastUpdatedAt.toDate().toLocaleTimeString()
                : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
