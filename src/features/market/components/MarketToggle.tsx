/**
 * 🔥 마켓 토글 컴포넌트
 */

interface MarketToggleProps {
  checked: boolean;
  onChange: () => void;
  contextSport: string;
}

export default function MarketToggle({ checked, onChange, contextSport }: MarketToggleProps) {
  const sportLabels: Record<string, string> = {
    soccer: "축구",
    basketball: "농구",
    running: "러닝",
    badminton: "배드민턴",
  };

  return (
    <div className="sticky top-[57px] z-10 bg-white border-b border-gray-200 px-4 py-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">
          {checked ? `${sportLabels[contextSport] || contextSport}만 보기` : "전체 보기"}
        </span>
      </label>
    </div>
  );
}
