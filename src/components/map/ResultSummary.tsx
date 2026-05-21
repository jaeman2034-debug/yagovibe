/**
 * 🔥 ResultSummary - 검색 결과 요약 UI
 * 
 * 책임 범위:
 * ✅ places.length > 0 일 때만 표시
 * ✅ 검색어와 결과 개수를 텍스트로 표시
 * 
 * ❌ 하지 않는 것:
 * - 음성 출력 (TTS는 VoiceUXController 책임)
 * - 지도 렌더링 (MapPageV3 책임)
 * - 검색 로직 (MapController 책임)
 */

type ResultSummaryProps = {
  searchQuery?: string;
  resultCount: number;
};

export default function ResultSummary({ searchQuery, resultCount }: ResultSummaryProps) {
  // 🔥 결과가 없으면 표시하지 않음
  if (resultCount === 0 || !searchQuery) {
    return null;
  }

  const message = getSummaryMessage(resultCount, searchQuery);

  return (
    <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-sm text-gray-700 font-medium">
        {message}
      </p>
    </div>
  );
}

/**
 * 🔥 결과 요약 메시지 생성
 */
function getSummaryMessage(count: number, query: string): string {
  if (count === 1) {
    return `근처에 ${query}이(가) 1곳 있어요`;
  }
  
  return `근처에 ${query}이(가) ${count}곳 있어요`;
}
