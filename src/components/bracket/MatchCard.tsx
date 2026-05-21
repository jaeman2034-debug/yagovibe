/**
 * 🔥 경기 카드 컴포넌트 (읽기 전용)
 * 사용자 공개 대진표용
 * - 읽기 전용 / 결과 강조만
 * - 시간 / 구장 정보 표시
 */

export default function MatchCard({ match }: { match: any }) {
  // 🔥 실제 프로젝트 데이터 구조에 맞춤
  const homeTeamName = match.homeTeamName || match.homeTeamId || "TBD";
  const awayTeamName = match.awayTeamName || match.awayTeamId || "TBD";
  const winnerTeamId = match.winnerTeamId;
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;

  // 승자 판단
  const isHomeWin = winnerTeamId && winnerTeamId === homeTeamId;
  const isAwayWin = winnerTeamId && winnerTeamId === awayTeamId;

  // 시간 포맷
  const formatTime = () => {
    if (!match.scheduledAt) return null;
    try {
      const date = match.scheduledAt?.toDate
        ? match.scheduledAt.toDate()
        : new Date(match.scheduledAt);
      return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const startTime = formatTime();
  const field = match.venue || match.field || null;

  // 점수 정보
  const hasScore = match.homeScore != null || match.awayScore != null;

  return (
    <div className="border-2 rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* 팀 정보 */}
      <div
        className={`flex justify-between items-center py-2 ${
          isHomeWin ? "font-bold text-green-600" : "text-gray-900"
        }`}
      >
        <span className="truncate pr-2">{homeTeamName}</span>
        {isHomeWin && <span className="text-green-600">🏆</span>}
      </div>

      {/* VS 구분선 */}
      <div className="text-center text-gray-400 text-sm py-1">VS</div>

      {/* 원정팀 정보 */}
      <div
        className={`flex justify-between items-center py-2 ${
          isAwayWin ? "font-bold text-green-600" : "text-gray-900"
        }`}
      >
        <span className="truncate pr-2">{awayTeamName}</span>
        {isAwayWin && <span className="text-green-600">🏆</span>}
      </div>

      {/* 점수 정보 */}
      {hasScore && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-center">
          <span className="text-lg font-bold text-gray-900">
            {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
          </span>
        </div>
      )}

      {/* 시간 / 구장 정보 */}
      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
        {startTime && <div>🕒 {startTime}</div>}
        {field && <div>📍 {field}</div>}
      </div>
    </div>
  );
}

