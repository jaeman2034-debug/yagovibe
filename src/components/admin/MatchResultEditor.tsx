/**
 * 🔥 관리자용 경기 결과 입력 컴포넌트 (최단 루트)
 * 
 * 기능:
 * - 관리자만 결과 입력 가능
 * - 승자 선택 (home/away)
 * - 저장 시 Firestore matches 업데이트
 * - 다음 라운드 자동 반영 (winner → nextMatch)
 */

import { useState } from "react";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { writeTournamentLog } from "@/utils/writeTournamentLog";

type Props = {
  tournamentId: string;
  associationId: string;
  match: any;
};

export default function MatchResultEditor({
  tournamentId,
  associationId,
  match,
}: Props) {
  // 🔥 모든 Hook은 컴포넌트 최상단에서 호출 (조건부 사용 절대 금지)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 승자가 있으면 표시만
  if (match.winner || match.winnerTeamId || match.status === "finished") {
    const winnerTeamName = match.winnerTeamId === match.homeTeamId
      ? match.homeTeamName || match.homeTeamId
      : match.winnerTeamId === match.awayTeamId
      ? match.awayTeamName || match.awayTeamId
      : null;

    return (
      <div className="mt-2 text-green-600 font-semibold text-sm">
        ✅ 승자 확정: {winnerTeamName || "확정됨"}
      </div>
    );
  }

  const submitResult = async (winner: "home" | "away") => {
    // 🔥 동시 클릭 방지 (UX)
    if (loading) return;

    // 🔥 위험 액션 Confirm UX
    const winnerTeamName = winner === "home" ? (match.homeTeamName || match.homeTeamId || "홈팀") : (match.awayTeamName || match.awayTeamId || "원정팀");
    if (!window.confirm(`정말 ${winnerTeamName}의 승리로 결과를 입력하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const matchRef = doc(
        db,
        "associations",
        associationId,
        "tournaments",
        tournamentId,
        "matches",
        match.id
      );

      // 승자 정보 결정
      const winnerTeamId = winner === "home" ? match.homeTeamId : match.awayTeamId;
      const winnerTeamName = winner === "home" ? match.homeTeamName : match.awayTeamName;

      if (!winnerTeamId) {
        throw new Error("팀 정보를 찾을 수 없습니다.");
      }

      // 1️⃣ 현재 경기 결과 업데이트
      await updateDoc(matchRef, {
        winner: winner,
        winnerTeamId: winnerTeamId,
        winnerTeamName: winnerTeamName || winnerTeamId,
        status: "finished",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2️⃣ 다음 라운드 자동 반영
      if (match.nextMatchId && match.nextSlot) {
        const nextRef = doc(
          db,
          "associations",
          associationId,
          "tournaments",
          tournamentId,
          "matches",
          match.nextMatchId
        );

        const nextMatchSnap = await getDoc(nextRef);
        if (!nextMatchSnap.exists()) {
          console.warn(`다음 경기를 찾을 수 없습니다: ${match.nextMatchId}`);
        } else {
          // nextSlot에 따라 homeTeam 또는 awayTeam 업데이트
          const fieldId = match.nextSlot === "home" ? "homeTeamId" : "awayTeamId";
          const fieldName = match.nextSlot === "home" ? "homeTeamName" : "awayTeamName";

          await updateDoc(nextRef, {
            [fieldId]: winnerTeamId,
            [fieldName]: winnerTeamName || winnerTeamId,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // 3️⃣ ❗ 결승이면 tournament 종료
      if (!match.nextMatchId) {
        const tournamentRef = doc(
          db,
          "associations",
          associationId,
          "tournaments",
          tournamentId
        );

        await updateDoc(tournamentRef, {
          status: "completed",
          winnerTeamId: winnerTeamId,
          winnerTeamName: winnerTeamName,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 🔥 결승 종료 로그
        await writeTournamentLog({
          associationId,
          tournamentId,
          type: "TOURNAMENT_FINISHED",
          message: `🏁 대회 종료 · 우승팀 ${winnerTeamName || winnerTeamId}`,
          actor: "system",
        });
      }

      // 🔥 결과 입력 로그 (모든 경기 공통, matchId 포함)
      const roundName = match.roundName || (match.roundNumber ? `${match.roundNumber}강` : "경기");
      await writeTournamentLog({
        associationId,
        tournamentId,
        type: "MATCH_RESULT",
        message: `✔ ${roundName} 경기 결과 입력 (${winnerTeamName || winnerTeamId} 승)`,
        actor: "admin",
        matchId: match.id, // 🔥 Undo를 위해 matchId 저장
      });

      // 🔥 실시간 반영: onSnapshot이 자동으로 UI 업데이트
      // window.location.reload() 불필요
      setLoading(false);
    } catch (e: any) {
      console.error("결과 저장 오류:", e);
      setError(e.message || "결과 저장에 실패했습니다.");
      setLoading(false);
    }
  };

  const homeTeamName = match.homeTeamName || match.homeTeamId || "홈팀";
  const awayTeamName = match.awayTeamName || match.awayTeamId || "원정팀";

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => submitResult("home")}
          disabled={loading}
          className="w-full py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold min-h-[44px]"
        >
          {loading ? "저장 중..." : `${homeTeamName} 승`}
        </button>
        <button
          onClick={() => submitResult("away")}
          disabled={loading}
          className="w-full py-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold min-h-[44px]"
        >
          {loading ? "저장 중..." : `${awayTeamName} 승`}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-red-600 text-xs">{error}</div>
      )}
    </div>
  );
}
