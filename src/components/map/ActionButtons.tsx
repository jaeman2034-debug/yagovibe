/**
 * 🔥 ActionButtons - 다음 행동 유도 UI
 * 
 * 책임 범위:
 * ✅ 결과가 있을 때만 표시
 * ✅ 사용자가 선택할 수 있는 행동 버튼 제공
 * 
 * ❌ 하지 않는 것:
 * - 음성 입력 (STT는 상위 레이어 책임)
 * - 자동 실행
 * - TTS 호출
 */

type ActionButtonsProps = {
  resultCount: number;
  onShowNearest?: () => void;
  onGetRecommendation?: () => void;
  onSearchAgain?: () => void;
};

export default function ActionButtons({
  resultCount,
  onShowNearest,
  onGetRecommendation,
  onSearchAgain,
}: ActionButtonsProps) {
  // 🔥 결과가 없으면 표시하지 않음
  if (resultCount === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {resultCount > 1 && onShowNearest && (
        <button
          onClick={onShowNearest}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition-transform"
        >
          가장 가까운 곳 보기
        </button>
      )}
      
      {resultCount > 1 && onGetRecommendation && (
        <button
          onClick={onGetRecommendation}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition-transform"
        >
          이 중 하나 추천해줘
        </button>
      )}
      
      {onSearchAgain && (
        <button
          onClick={onSearchAgain}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition-transform"
        >
          다시 찾기
        </button>
      )}
    </div>
  );
}
