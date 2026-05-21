/**
 * 🔥 경기 카드 컴포넌트 (Read-only 모드 지원)
 * 사용자 공개 대진표용 간단한 구조
 */

type Match = {
  id: string;
  homeTeamName?: string;
  homeTeamId?: string;
  awayTeamName?: string;
  awayTeamId?: string;
  winnerTeamId?: string;
  scheduledAt?: any;
  venue?: string;
  field?: string;
  status?: 'scheduled' | 'playing' | 'finished' | 'pending';
  winner?: 'home' | 'away' | string;
  homeScore?: number;
  awayScore?: number;
};

interface MatchCardProps {
  match: Match;
  isAdmin?: boolean;
  onSelectWinner?: (matchId: string, winner: 'home' | 'away') => void;
  isSelecting?: boolean;
  readonly?: boolean; // 🔥 읽기 전용 모드
}

export function MatchCard({ match, isAdmin = false, onSelectWinner, isSelecting = false, readonly = false }: MatchCardProps) {
  // 승자 판단
  const winner =
    match.winnerTeamId === match.homeTeamId
      ? "home"
      : match.winnerTeamId === match.awayTeamId
      ? "away"
      : null;

  // 🔥 Read-only 모드: 시간/구장 정보 포함 (사용자 공개 대진표용)
  if (readonly) {
    const homeTeam = match.homeTeamName || match.homeTeamId || "BYE";
    const awayTeam = match.awayTeamName || match.awayTeamId || "BYE";
    
    const formatTime = () => {
      if (!match.scheduledAt) return null;
      try {
        const date = match.scheduledAt?.toDate 
          ? match.scheduledAt.toDate() 
          : new Date(match.scheduledAt);
        return {
          dateStr: date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            weekday: 'short',
          }),
          timeStr: date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          fullStr: date.toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      } catch {
        return null;
      }
    };
    
    const timeInfo = formatTime();
    const fieldInfo = match.venue || match.field || '구장 미정';
    const isFinished = match.status === 'finished';
    const isPlaying = match.status === 'playing';

    return (
      <div className={`border-2 rounded-lg p-3 md:p-4 mb-3 bg-white ${
        isFinished 
          ? 'border-green-400 bg-green-50' 
          : isPlaying 
          ? 'border-yellow-400 bg-yellow-50' 
          : 'border-gray-300'
      }`}>
        {/* 시간 / 구장 정보 */}
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
          {timeInfo ? (
            <div className="flex flex-col">
              <span className="text-blue-700 font-bold text-sm md:text-base">
                {timeInfo.fullStr}
              </span>
              {timeInfo.dateStr && (
                <span className="text-xs text-gray-500 mt-0.5">{timeInfo.dateStr}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">시간 미정</span>
          )}
          <span className="text-purple-700 font-semibold text-sm md:text-base">
            📍 {fieldInfo}
          </span>
        </div>

        {/* 팀 정보 (모바일: 세로 스택, 데스크탑: 가로 배치) */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-2">
          <div className={`flex-1 text-center ${
            winner === "home" 
              ? 'text-green-800 font-extrabold text-base md:text-lg bg-green-50 rounded-lg py-2 px-3 border-2 border-green-600' 
              : 'text-gray-900 font-semibold text-sm md:text-base'
          }`}>
            <div className="truncate">{homeTeam}</div>
            {winner === "home" && (
              <div className="text-xs text-green-700 mt-1 font-medium">승리</div>
            )}
          </div>
          <div className="text-center text-sm text-gray-400 sm:hidden">VS</div>
          <span className="text-gray-600 font-bold text-xl flex-shrink-0 hidden sm:inline">vs</span>
          <div className={`flex-1 text-center ${
            winner === "away" 
              ? 'text-green-800 font-extrabold text-base md:text-lg bg-green-50 rounded-lg py-2 px-3 border-2 border-green-600' 
              : 'text-gray-900 font-semibold text-sm md:text-base'
          }`}>
            <div className="truncate">{awayTeam}</div>
            {winner === "away" && (
              <div className="text-xs text-green-700 mt-1 font-medium">승리</div>
            )}
          </div>
        </div>

        {/* 점수 정보 */}
        {(match.homeScore != null || match.awayScore != null) && (
          <div className="flex justify-center items-center gap-3 mt-3 pt-3 border-t border-gray-300">
            <span className="text-2xl md:text-3xl font-bold text-blue-900">
              {match.homeScore ?? '-'}
            </span>
            <span className="text-gray-600 text-xl">:</span>
            <span className="text-2xl md:text-3xl font-bold text-blue-900">
              {match.awayScore ?? '-'}
            </span>
            {winner && (
              <span className="ml-2 text-green-600 font-bold text-xl">🏆</span>
            )}
          </div>
        )}

        {/* 상태 정보 */}
        <div className="text-right mt-2 pt-2 border-t border-gray-200">
          <span className={`font-semibold text-xs md:text-sm ${
            isFinished 
              ? 'text-green-800' 
              : isPlaying 
              ? 'text-yellow-800' 
              : 'text-gray-600'
          }`}>
            {isFinished ? '경기 종료' : isPlaying ? '경기 진행중' : '경기 예정'}
          </span>
        </div>
      </div>
    );
  }

  // Admin 모드: 상세 정보 포함
  const homeTeam = match.homeTeamName || match.homeTeamId || 'TBD';
  const awayTeam = match.awayTeamName || match.awayTeamId || 'TBD';
  
  const formatTime = () => {
    if (!match.scheduledAt) return '시간 미정';
    try {
      const date = match.scheduledAt?.toDate 
        ? match.scheduledAt.toDate() 
        : new Date(match.scheduledAt);
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '시간 미정';
    }
  };
  
  const fieldInfo = match.venue || match.field || '구장 미정';
  const isFinished = match.status === 'finished';
  const isPlaying = match.status === 'playing';

  return (
    <div className="border rounded-lg p-4 mb-3 bg-white">
      <div className="flex justify-between items-center text-sm mb-3 pb-2 border-b border-gray-200">
        <span className="text-gray-600 font-medium">{formatTime()}</span>
        <span className="text-gray-600">{fieldInfo}</span>
      </div>

      <div className="flex justify-between items-center gap-3">
        <div className={`flex-1 text-center ${winner === "home" ? "text-green-700 font-bold" : ""}`}>
          <div className="truncate">{homeTeam}</div>
        </div>
        <span className="text-gray-400 font-bold text-lg flex-shrink-0">vs</span>
        <div className={`flex-1 text-center ${winner === "away" ? "text-green-700 font-bold" : ""}`}>
          <div className="truncate">{awayTeam}</div>
        </div>
      </div>

      {(match.homeScore != null || match.awayScore != null) && (
        <div className="flex justify-center items-center gap-2 mt-2 pt-2 border-t border-gray-200">
          <span className="text-lg font-bold text-gray-900">
            {match.homeScore ?? '-'}
          </span>
          <span className="text-gray-400">:</span>
          <span className="text-lg font-bold text-gray-900">
            {match.awayScore ?? '-'}
          </span>
        </div>
      )}

      {isFinished && (
      <div className="text-xs text-right mt-2 pt-2 border-t border-gray-200">
          <span className="text-green-700 font-medium">경기 종료</span>
      </div>
      )}

      {/* 관리자 전용: 승자 선택 버튼 */}
      {!readonly && isAdmin && !isFinished && match.status !== 'finished' && onSelectWinner && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => onSelectWinner(match.id, 'home')}
            disabled={isSelecting}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isSelecting ? '처리중...' : '홈팀 승'}
          </button>
          <button
            onClick={() => onSelectWinner(match.id, 'away')}
            disabled={isSelecting}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isSelecting ? '처리중...' : '원정팀 승'}
          </button>
        </div>
      )}
    </div>
  );
}
