/**
 * 🔥 스토리 인디케이터 컴포넌트
 * 
 * 기능:
 * - 현재 스토리 위치 표시
 * - 클릭으로 스토리 이동
 */

interface StoryIndicatorProps {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}

export function StoryIndicator({ total, current, onSelect }: StoryIndicatorProps) {
  if (total <= 1) return null;

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`h-2 rounded-full transition-all ${
            index === current ? "bg-white w-8" : "bg-blue-400 w-2"
          }`}
          aria-label={`스토리 ${index + 1}`}
        />
      ))}
    </div>
  );
}
